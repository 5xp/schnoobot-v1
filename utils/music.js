const { getInfo } = require("ytdl-core");
const { raw: ytdl } = require("youtube-dl-exec");
const {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionDisconnectReason,
  VoiceConnectionStatus,
  demuxProbe,
} = require("@discordjs/voice");
const util = require("util");

const noOp = () => {};
const sleep = util.promisify(setTimeout);

class MusicSubscription {
  constructor(voiceConnection) {
    this.voiceConnection = voiceConnection;
    this.audioPlayer = createAudioPlayer();
    this.queue = [];
    this.queueLock = false;
    this.readyLock = false;

    this.voiceConnection.on("stateChange", async (_, newState) => {
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
          try {
            await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5000);
          } catch {
            this.voiceConnection.destroy();
          }
        } else if (this.voiceConnection.rejoinAttempts < 5) {
          await sleep((this.voiceConnection.rejoinAttempts + 1) * 5_000);
          this.voiceConnection.rejoin();
        } else {
          this.voiceConnection.destroy();
        }
      } else if (newState.status === VoiceConnectionStatus.Destroyed) {
        this.stop();
      } else if (
        !this.readyLock &&
        (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
      ) {
        this.readyLock = true;
        try {
          await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20000);
        } catch {
          if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy();
        } finally {
          this.readyLock = false;
        }
      }
    });

    this.audioPlayer.on("stateChange", (oldState, newState) => {
      // audio resource finishes playing
      if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
        oldState.resource.metadata.onFinish();
        this.processQueue();
      } else if (newState.status === AudioPlayerStatus.Playing) {
        // new track starts playing
        newState.resource.metadata.onStart();
      }
    });

    this.audioPlayer.on("error", error => error.resource.metadata.onError(error));

    this.voiceConnection.subscribe(this.audioPlayer);
  }

  async processQueue() {
    if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.queue.length === 0) {
      return;
    }

    this.queueLock = true;

    const nextTrack = this.queue.shift();

    try {
      const resource = await nextTrack.createAudioResource();
      this.audioPlayer.play(resource);
      this.queueLock = false;
    } catch (error) {
      nextTrack.onError(error);
      this.queueLock = false;
      return this.processQueue();
    }
  }

  enqueue(track) {
    this.queue.push(track);
    this.processQueue();
  }

  stop() {
    this.queueLock = true;
    this.queue = [];
    this.audioPlayer.stop(true);
  }
}

class Track {
  constructor(data) {
    this.url = data.url;
    this.title = data.title;
    this.onStart = data.onStart;
    this.onFinish = data.onFinish;
    this.onError = data.onError;
  }

  static async from(url, methods) {
    const info = await getInfo(url);

    const wrappedMethods = {
      onStart() {
        wrappedMethods.onStart = noOp;
        methods.onStart();
      },
      onFinish() {
        wrappedMethods.onFinish = noOp;
        methods.onFinish();
      },
      onError(error) {
        wrappedMethods.onError = noOp;
        methods.onError(error);
      },
    };

    return new Track({ url, title: info.videoDetails.title, ...wrappedMethods });
  }

  createAudioResource() {
    return new Promise((resolve, reject) => {
      const process = ytdl(
        this.url,
        {
          o: "-",
          q: "",
          f: "bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio",
          r: "100K",
        },
        { stdio: ["ignore", "pipe", "ignore"] }
      );

      if (!process.stdout) {
        reject(new Error("No stdout"));
        return;
      }

      const stream = process.stdout;

      const onError = error => {
        if (!process.killed) process.kill();
        stream.resume();
        reject(error);
      };

      process.once("spawn", () => {
        demuxProbe(stream)
          .then(probe => {
            resolve(createAudioResource(probe.stream, { metadata: this, inputType: probe.type }));
          })
          .catch(onError);
      });
    });
  }
}

module.exports = {
  MusicSubscription,
  Track,
};
