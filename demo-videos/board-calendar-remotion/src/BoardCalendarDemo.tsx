import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Composition,
  interpolate,
  Sequence,
  Series,
  staticFile,
  useCurrentFrame,
} from "remotion";

const colors = { cream: "#f5f3ee", green: "#35533b", gold: "#d69a35", ink: "#152328" };
const fps = 30;
const walkthroughFrames = 1581;

const scenes = [
  { start: 0, end: 4.45, caption: "Keep board meetings, tasks, and deadlines in one place" },
  { start: 4.45, end: 7.71, caption: "Set up your organization and board roles" },
  { start: 7.71, end: 11.36, caption: "Create a preparation rule once" },
  { start: 11.36, end: 16.54, caption: "Schedule a board meeting with its details" },
  { start: 16.54, end: 20.97, caption: "The saved meeting appears in Calendar" },
  { start: 20.97, end: 25.12, caption: "A preparation task appears seven days earlier" },
  { start: 25.12, end: 29.9, caption: "See the task, owner, and due date in Workflows" },
  { start: 29.9, end: 32.86, caption: "Open the meeting from the schedule" },
  { start: 32.86, end: 38.88, caption: "Draft the meeting's consent agenda" },
  { start: 38.88, end: 41.66, caption: "Approve the agenda for the board package" },
  { start: 41.66, end: 46.23, caption: "Review the meeting's board package" },
  { start: 46.23, end: 49.57, caption: "The audit log records package activity when it occurs" },
  { start: 49.57, end: 52.7, caption: "Return to your board overview" },
];

function TitleCard({ closing = false }: { closing?: boolean }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 75, 90], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", background: colors.cream, color: colors.ink, display: "flex", fontFamily: "Inter, Arial, sans-serif", justifyContent: "center" }}>
      <div style={{ opacity, textAlign: "center", width: 1300 }}>
        <div style={{ color: colors.green, fontSize: 29, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase" }}>Olea Connects</div>
        <div style={{ background: colors.gold, height: 7, margin: "27px auto 30px", width: 120 }} />
        <h1 style={{ fontSize: 86, letterSpacing: -4, lineHeight: 1.05, margin: 0 }}>{closing ? "Board work, connected" : "Board Calendar"}</h1>
        <p style={{ color: colors.green, fontSize: 35, lineHeight: 1.3, margin: "30px 0 0" }}>
          {closing ? "From meeting planning to prepared board packages." : "A real workflow from meeting to board package"}
        </p>
        <p style={{ color: "#607167", fontSize: 23, marginTop: 56 }}>
          {closing ? "oleaconnects.com" : "Product walkthrough using a fictional nonprofit"}
        </p>
      </div>
    </AbsoluteFill>
  );
}

function SceneLabel({ durationInFrames, note }: { durationInFrames: number; note: string }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90,
      display: "flex", alignItems: "center", justifyContent: "center", opacity,
      color: "white", fontFamily: "Inter, Arial, sans-serif", fontSize: 29, fontWeight: 650,
    }}>{note}</div>
  );
}

function Walkthrough() {
  const seconds = useCurrentFrame() / fps;
  const modalOpen = (seconds >= 11.36 && seconds < 16.54) || (seconds >= 32.86 && seconds < 41.66);
  return (
    <AbsoluteFill style={{ background: colors.cream }}>
      <Video src={staticFile("board-calendar-walkthrough.mp4")} muted objectFit="contain" premountFor={fps}
        style={{ height: 990, width: "100%" }} />
      {!modalOpen && <div style={{ position: "absolute", top: 92, left: 80, width: 265, height: 34,
        display: "flex", alignItems: "center", paddingLeft: 16, boxSizing: "border-box",
        background: "white", color: colors.ink, fontFamily: "Inter, Arial, sans-serif",
        fontSize: 17, fontWeight: 700 }}>Harbour Neighbours Society</div>}
      <div style={{ position: "absolute", bottom: 0, height: 90, width: "100%", background: colors.green }} />
      <div style={{ position: "absolute", top: 25, right: 29, borderRadius: 999,
        background: "rgba(255, 255, 255, 0.94)", color: colors.green,
        fontFamily: "Inter, Arial, sans-serif", fontSize: 20, fontWeight: 750,
        letterSpacing: 1, padding: "11px 17px", textTransform: "uppercase" }}>Demo data</div>
      {scenes.map(({ start, end, caption }) => {
        const startFrame = Math.round(start * fps);
        const durationInFrames = Math.round(end * fps) - startFrame;
        return <Sequence key={caption} from={startFrame} durationInFrames={durationInFrames} premountFor={fps}>
          <SceneLabel durationInFrames={durationInFrames} note={caption} />
        </Sequence>;
      })}
    </AbsoluteFill>
  );
}

function BoardCalendarDemo() {
  return (
    <Series>
      <Series.Sequence name="Opening" durationInFrames={90} premountFor={fps}><TitleCard /></Series.Sequence>
      <Series.Sequence name="Product walkthrough" durationInFrames={walkthroughFrames} premountFor={fps}><Walkthrough /></Series.Sequence>
      <Series.Sequence name="Closing" durationInFrames={90} premountFor={fps}><TitleCard closing /></Series.Sequence>
    </Series>
  );
}

export function BoardCalendarDemoComposition() {
  return <Composition id="BoardCalendarDemo" component={BoardCalendarDemo}
    durationInFrames={walkthroughFrames + 180} fps={fps} width={1920} height={1080} />;
}
