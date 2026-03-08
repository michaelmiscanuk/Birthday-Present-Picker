export interface Item {
  id: string;
  name: string;
  emoji: string;
  pickedBy: string | null;
}

export interface ChecklistState {
  items: Item[];
  lastUpdated: number;
}

export interface ToggleResponse {
  success: boolean;
  state: ChecklistState;
  message?: string;
}
