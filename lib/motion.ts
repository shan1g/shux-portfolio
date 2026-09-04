export const springSnappy = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export const springSoft = {
  type: "spring" as const,
  stiffness: 260,
  damping: 28,
};

export const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};
