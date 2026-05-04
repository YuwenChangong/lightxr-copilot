export type TaskStep = {
  id: number;
  title: string;
  instruction: string;
  successCriteria: string;
};

export type TaskTemplate = {
  id: string;
  name: string;
  description: string;
  steps: TaskStep[];
};

export const taskTemplates: TaskTemplate[] = [
  {
    id: "battery-assembly",
    name: "Battery Assembly",
    description:
      "A simple guided assembly workflow for testing LightXR Copilot.",
    steps: [
      {
        id: 1,
        title: "Find the battery",
        instruction: "Find the battery module in front of you.",
        successCriteria:
          "The battery module is visible in the captured image.",
      },
      {
        id: 2,
        title: "Check orientation",
        instruction:
          "Check that the battery contacts face the correct slot direction.",
        successCriteria:
          "The battery is oriented toward the slot and not upside down.",
      },
      {
        id: 3,
        title: "Place the battery",
        instruction: "Place the battery into the target slot.",
        successCriteria:
          "The battery is inside or directly above the target slot.",
      },
      {
        id: 4,
        title: "Confirm alignment",
        instruction: "Confirm that the battery is flat and aligned.",
        successCriteria:
          "The battery appears seated, flat, and aligned with the slot.",
      },
    ],
  },
];