"use client";

import * as React from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { FineType } from "@/types/common";

interface FineTypeToggleProps {
  value: FineType;
  onChange: (value: FineType) => void;
}

export function FineTypeToggle({ value, onChange }: FineTypeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(val) => {
        if (val) onChange(val as FineType);
      }}
      className="grid grid-cols-3 gap-2"
    >
      <ToggleGroupItem value="Fine" aria-label="Fine">
        Fine
      </ToggleGroupItem>
      <ToggleGroupItem value="Credit" aria-label="Credit">
        Credit
      </ToggleGroupItem>
      <ToggleGroupItem value="Warning" aria-label="Warning">
        Warning
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
