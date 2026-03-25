import { StyleSheet, Text, View } from "react-native";
import { ClassificationStatus } from "@/lib/halal-classifier";
import { StatusColors } from "@/constants/theme";

const LABELS: Record<ClassificationStatus, string> = {
  halal: "HALAL",
  haram: "HARAM",
  mashbooh: "MASHBOOH",
};

interface Props {
  status: ClassificationStatus;
  size?: "sm" | "lg";
}

export function ClassificationBadge({ status, size = "sm" }: Props) {
  const colors = StatusColors[status];
  const isLarge = size === "lg";

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.background },
        isLarge && styles.badgeLg,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: colors.text },
          isLarge && styles.labelLg,
        ]}
      >
        {LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeLg: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  labelLg: {
    fontSize: 18,
    letterSpacing: 1,
  },
});
