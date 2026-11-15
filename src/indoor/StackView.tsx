/** @file Exploded "stack" view of every level (phase 2); hidden while STACK_VIEW_ENABLED is false. */
import type { IndoorRoute } from "./route";
import type { IndoorBuilding, IndoorLevel, IndoorSpace } from "./types";

type DrawnLevel = Extract<IndoorLevel, { available: true }>;

/** Shows the Plan | Stack toggle in the building header. */
export const STACK_VIEW_ENABLED = false;

/** Every available level as a plate in one CSS 3D scene. */
export default function StackView(_props: { building: IndoorBuilding; levels: DrawnLevel[]; activeId?: string; selected?: IndoorSpace; route?: IndoorRoute; activeStep: number | null; onLevel: (id: string) => void; roomCount: (level: IndoorLevel) => number }) {
  return null;
}
