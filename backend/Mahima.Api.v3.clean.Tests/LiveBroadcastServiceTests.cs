using Mahima.Api.v3.clean.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using System.Reflection;

namespace Mahima.Api.v3.clean.Tests;

public sealed class LiveBroadcastServiceTests
{
    private readonly LiveBroadcastService _service = new(
        NullLogger<LiveBroadcastService>.Instance,
        new ConfigurationBuilder().Build());

    [Fact]
    public void AutoMixBuildsCleanSpeechAndPeakProtectionChain()
    {
        var args = Build(
            inputs:
            [
                new("camera", "Camera", "rtsp://camera/live", true, true, 0.8, false, true, false),
                new("mic", "Speech mic", "dshow://audio=USB Microphone", false, true, 1.1, false, true, true)
            ],
            audioMix: new("auto", true, true, true, -16, LowLatency: false));

        var filters = FilterGraph(args);
        Assert.Contains("highpass=f=80", filters);
        Assert.Contains("afftdn=nf=-35:tn=1:gs=5", filters);
        Assert.Contains("agate=threshold=0.015", filters);
        Assert.Contains("deesser=i=0.25", filters);
        Assert.Contains("acompressor=threshold=0.125", filters);
        Assert.Contains("dynaudnorm=f=250", filters);
        Assert.Contains("loudnorm=I=-16:TP=-2:LRA=7", filters);
        Assert.Contains("alimiter=limit=0.89", filters);
        Assert.Contains("amix=inputs=2", filters);
    }

    [Fact]
    public void ManualMixSkipsAutomaticLoudnessButKeepsLimiter()
    {
        var args = Build(audioMix: new("manual", true, true, true, -16));
        var filters = FilterGraph(args);
        Assert.DoesNotContain("loudnorm=", filters);
        Assert.Contains("alimiter=", filters);
    }

    [Fact]
    public void ChannelStripBuildsEqPanGainAndPositiveSyncDelay()
    {
        var input = new BroadcastInput("mic", "Mic", "rtsp://camera/live", true, true,
            GainDb: -3, Pan: .25, EqLowDb: -2, EqMidDb: 3, EqHighDb: 1, SyncMs: 180);
        var filters = FilterGraph(Build(inputs: [input]));
        Assert.Contains("adelay=180|180", filters);
        Assert.Contains("equalizer=f=120", filters);
        Assert.Contains("equalizer=f=2500", filters);
        Assert.Contains("equalizer=f=8000", filters);
        Assert.Contains("volume=-3dB", filters);
        Assert.Contains("pan=stereo", filters);
    }

    [Fact]
    public void NegativeSyncAdvancesAudioAndOutputUsesBroadcastSampleRate()
    {
        var input = new BroadcastInput("mic", "Mic", "rtsp://camera/live", true, true, SyncMs: -220);
        var args = Build(inputs: [input]);
        var filters = FilterGraph(args);
        Assert.Contains("atrim=start=0.22,asetpts=PTS-STARTPTS", filters);
        Assert.Equal("48000", args[args.ToList().IndexOf("-ar") + 1]);
        Assert.Equal("192k", args[args.ToList().IndexOf("-b:a") + 1]);
    }

    [Fact]
    public void LowLatencyAutoModeAvoidsLongWindowNormalizers()
    {
        var filters = FilterGraph(Build(audioMix: new("auto", Normalize: true, AutoGain: true, LowLatency: true)));
        Assert.DoesNotContain("dynaudnorm=", filters);
        Assert.DoesNotContain("loudnorm=", filters);
        Assert.Contains("acompressor=", filters);
        Assert.Contains("alimiter=", filters);
    }

    [Fact]
    public void StereoInterfaceCanBeSplitIntoIndependentMonoMixerChannels()
    {
        var input = new BroadcastInput("interface", "M-Track", "srt://0.0.0.0:8554?mode=listener", true, true,
            SplitStereo: true, Channel1Name: "Mic", Channel2Name: "Mixer",
            Channel1Volume: .75, Channel2Volume: .6, Channel1GainDb: -2, Channel2Pan: .2);
        var filters = FilterGraph(Build(inputs: [input]));
        Assert.Contains("[0:a]asplit=2[split0l][split0r]", filters);
        Assert.Contains("[split0l]pan=stereo|c0=c0|c1=c0", filters);
        Assert.Contains("[split0r]pan=stereo|c0=c1|c1=c1", filters);
        Assert.Contains("volume=0.75", filters);
        Assert.Contains("volume=0.6", filters);
        Assert.Contains("amix=inputs=2", filters);
    }

    [Fact]
    public void UdpProgramOutputCarriesMpegTsToObsPort()
    {
        var args = Build(localOutput: new(true, "udp", "127.0.0.1", 10000));
        Assert.Contains("[f=mpegts:onfail=ignore]udp://127.0.0.1:10000?pkt_size=1316", args[^1]);
    }

    [Fact]
    public void SrtOutputUsesListenerModeAndClampsUnsafePort()
    {
        var args = Build(localOutput: new(true, "srt", "studio-host", 99));
        Assert.Contains("[f=mpegts:onfail=ignore]srt://studio-host:1024?mode=listener&latency=80000", args[^1]);
        Assert.Equal("1", args[args.ToList().IndexOf("-use_fifo") + 1]);
        Assert.Contains("attempt_recovery=1", args[args.ToList().IndexOf("-fifo_options") + 1]);
    }

    [Fact]
    public void DirectShowLaptopAudioIsTranslatedToFfmpegInputFormat()
    {
        var args = Build(inputs:
        [
            new("camera", "Camera", "rtsp://camera/live"),
            new("sound", "Laptop", "dshow://audio=Stereo Mix", false, true)
        ]);

        var dshow = Array.IndexOf(args.ToArray(), "dshow");
        Assert.True(dshow > 0);
        Assert.Equal("-f", args[dshow - 1]);
        Assert.Equal("-i", args[dshow + 1]);
        Assert.Equal("audio=Stereo Mix", args[dshow + 2]);
    }

    [Fact]
    public void SyntheticTestSourcesAreTranslatedToLavfiInputs()
    {
        var args = Build(inputs:
        [
            new("bars", "Test bars", "lavfi://testsrc2=size=1280x720:rate=30", true, false),
            new("tone", "Test tone", "lavfi://sine=frequency=1000:sample_rate=44100", false, true)
        ]);
        Assert.Equal(2, args.Count(x => x == "lavfi"));
        Assert.Equal(2, args.Count(x => x == "-re"));
        Assert.Contains("testsrc2=size=1280x720:rate=30", args);
        Assert.Contains("sine=frequency=1000:sample_rate=44100", args);
    }

    [Fact]
    public void MultiCameraGraphBuildsRuntimeCameraAndLayoutSelectors()
    {
        var filters = FilterGraph(Build(inputs:
        [
            new("gopro", "GoPro", "srt://0.0.0.0:8554?mode=listener", true, true),
            new("iriun", "Iriun", "srt://0.0.0.0:8555?mode=listener", true, false)
        ]));

        Assert.Contains("streamselect@camera=inputs=2:map=0", filters);
        Assert.Contains("streamselect@layout=inputs=4:map=0", filters);
        Assert.Contains("hstack=inputs=2[splitprogram]", filters);
        Assert.Contains("overlay=W-w-40:40[pipprogram]", filters);
        Assert.Contains("zmq=b=tcp\\\\\\://127.0.0.1\\\\\\:5555", filters);
    }

    [Fact]
    public void MediaInputLoopsAtRealtimeRate()
    {
        var args = Build(inputs: [new("demo", "Demo", "/var/www/media/demo.mp4", true, false, Kind: "media", Loop: true)]);
        var input = args.ToList().IndexOf("/var/www/media/demo.mp4");
        Assert.True(input > 3);
        Assert.Equal("-re", args[input - 2]);
        Assert.Equal("-1", args[input - 3]);
        Assert.Equal("-stream_loop", args[input - 4]);
    }

    [Fact]
    public void StreamKeyIsKeptInTeeTargetAndCanBeRedactedByRuntimeLogger()
    {
        var args = Build(destinations: [new("YouTube", "rtmps://a.rtmps.youtube.com:443/live2", "secret-key")]);
        Assert.Contains("rtmps://a.rtmps.youtube.com:443/live2/secret-key", args[^1]);
    }

    [Fact]
    public void StartRejectsRequestWithoutAnyOutput()
    {
        var request = new LiveBroadcastStartRequest(
            null, null, null, "720p", Inputs: [new("camera", "Camera", "rtsp://camera/live")]);

        var error = Assert.Throws<ArgumentException>(() => _service.Start(request));
        Assert.Contains("YouTube, OBS/vMix output, or local recording", error.Message);
    }

    [Theory]
    [InlineData("Connection reset by peer")]
    [InlineData("Error writing trailer: Broken pipe")]
    [InlineData("SRT connection timed out")]
    public void ConnectionFailuresAreRetainedAsImportantLogs(string line)
    {
        var method = typeof(LiveBroadcastService).GetMethod("IsImportantLog", BindingFlags.Static | BindingFlags.NonPublic);
        Assert.NotNull(method);
        Assert.True(Assert.IsType<bool>(method.Invoke(null, [line])));
    }

    private IReadOnlyList<string> Build(
        IReadOnlyList<BroadcastInput>? inputs = null,
        IReadOnlyList<BroadcastDestination>? destinations = null,
        BroadcastAudioMix? audioMix = null,
        BroadcastLocalOutput? localOutput = null)
    {
        // Deployment nodes can temporarily have either the private or internal
        // implementation while source files are synchronized. Exercise the
        // real command builder without making it part of the public API.
        var method = typeof(LiveBroadcastService).GetMethod(
            "BuildArguments",
            BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new MissingMethodException(nameof(LiveBroadcastService), "BuildArguments");
        var result = method.Invoke(_service,
        [
            inputs ?? [new("camera", "Camera", "rtsp://camera/live")],
            destinations ?? [],
            Array.Empty<BroadcastOverlay>(), "single", 0, "720p", false, null,
            audioMix ?? new(), localOutput ?? new()
        ]);
        return Assert.IsAssignableFrom<IReadOnlyList<string>>(result);
    }

    private static string FilterGraph(IReadOnlyList<string> args)
    {
        var index = args.ToList().IndexOf("-filter_complex");
        Assert.True(index >= 0);
        return args[index + 1];
    }
}
