/**
 * The small set of line icons the UI needs, drawn as SVG paths so they scale
 * cleanly and inherit the ink colour.
 */
import { memo } from "react";
import Svg, { Circle, Path, Polyline, Rect } from "react-native-svg";

export type IconName =
  | "play"
  | "levels"
  | "settings"
  | "back"
  | "undo"
  | "restart"
  | "lock"
  | "check"
  | "sound"
  | "music"
  | "vibrate"
  | "trash";

interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly color: string;
  readonly strokeWidth?: number;
}

function IconComponent({ name, size = 22, color, strokeWidth = 2 }: IconProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "play" ? (
        <Path d="M7 4.5 19 12 7 19.5Z" {...common} fill={color} />
      ) : null}

      {name === "levels" ? (
        <>
          <Rect x="3.5" y="3.5" width="7" height="7" rx="2" {...common} />
          <Rect x="13.5" y="3.5" width="7" height="7" rx="2" {...common} />
          <Rect x="3.5" y="13.5" width="7" height="7" rx="2" {...common} />
          <Rect x="13.5" y="13.5" width="7" height="7" rx="2" {...common} />
        </>
      ) : null}

      {name === "settings" ? (
        <>
          <Path
            d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
            {...common}
          />
          <Circle cx="12" cy="12" r="3" {...common} />
        </>
      ) : null}

      {name === "back" ? (
        <Polyline points="15,4 7,12 15,20" {...common} />
      ) : null}

      {name === "undo" ? (
        <>
          <Path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H8" {...common} />
          <Polyline points="8,4 3.2,9 8,14" {...common} />
        </>
      ) : null}

      {name === "restart" ? (
        <>
          <Path d="M20 12a8 8 0 1 1-2.6-5.9" {...common} />
          <Polyline points="20,3.5 20,8.5 15,8.5" {...common} />
        </>
      ) : null}

      {name === "lock" ? (
        <>
          <Rect x="5" y="10.5" width="14" height="10" rx="3" {...common} />
          <Path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" {...common} />
        </>
      ) : null}

      {name === "check" ? (
        <Polyline points="4.5,12.5 9.5,17.5 19.5,6.5" {...common} />
      ) : null}

      {name === "sound" ? (
        <>
          <Path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4Z" {...common} />
          <Path
            d="M15.8 9a4.2 4.2 0 0 1 0 6M18.4 6.4a7.8 7.8 0 0 1 0 11.2"
            {...common}
          />
        </>
      ) : null}

      {name === "music" ? (
        <>
          <Path d="M9 18V5.5l10-2V16" {...common} />
          <Circle cx="6.5" cy="18" r="2.5" {...common} />
          <Circle cx="16.5" cy="16" r="2.5" {...common} />
        </>
      ) : null}

      {name === "vibrate" ? (
        <>
          <Rect x="8.5" y="4" width="7" height="16" rx="2" {...common} />
          <Path d="M4.5 9v6M2 10.5v3M19.5 9v6M22 10.5v3" {...common} />
        </>
      ) : null}

      {name === "trash" ? (
        <>
          <Path d="M4.5 6.5h15" {...common} />
          <Path
            d="M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7"
            {...common}
          />
          <Path
            d="M6.5 6.5 7.4 19a1.8 1.8 0 0 0 1.8 1.6h5.6a1.8 1.8 0 0 0 1.8-1.6l.9-12.5"
            {...common}
          />
        </>
      ) : null}
    </Svg>
  );
}

export const Icon = memo(IconComponent);
