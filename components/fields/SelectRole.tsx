"use client";

import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";

interface SelectRoleProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

type Role = { name: string; _id: string }[];

export function SelectRole({
  value,
  onValueChange,
  placeholder = "Select a role",
  className,
}: SelectRoleProps) {
  const roles: Role | undefined = useQuery(api.acl.getRoles);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger defaultValue="admin" className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        {roles === undefined ? (
          <SelectItem value="...loading" disabled>
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading...
            </span>
          </SelectItem>
        ) : roles.length === 0 ? (
          <SelectItem value="" disabled>
            No roles found
          </SelectItem>
        ) : (
          roles.map((role) => {
            return (
              <SelectItem key={role._id} value={role.name ?? "--"}>
                {role.name}
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
}
