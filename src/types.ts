export type Category =
  | "academic"
  | "dining"
  | "housing"
  | "recreation"
  | "landmark"
  | "other";

export interface PlaceProperties {
  id: string;
  name: string;
  category: Category;
  description?: string;
}
