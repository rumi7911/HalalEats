import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? "light";

  const adaptiveTint =
    process.env.EXPO_OS === "ios"
      ? DynamicColorIOS({
          light: "#0A7EA4",
          dark: "#34D399",
        })
      : Colors[colorScheme].tint;

  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      minimizeBehavior="onScrollDown"
      tintColor={adaptiveTint}
    >
      <NativeTabs.Trigger name="index">
        <Icon
          sf={{ default: "barcode.viewfinder", selected: "barcode.viewfinder" }}
          drawable="qr_code_scanner"
        />
        <Label>Scanner</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history" role="history">
        <Icon
          sf={{
            default: "clock.arrow.circlepath",
            selected: "clock.arrow.circlepath",
          }}
          drawable="history"
        />
        <Label>History</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
