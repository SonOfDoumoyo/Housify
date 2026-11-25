import { Check, Home, KeyRound } from "lucide-react";
import { ROLES, type Role } from "../lib/googleAuth";

type RolePickerProps = {
  value: Role | "";
  onChange: (role: Role) => void;
  error?: string;
  idPrefix?: string;
};

/**
 * Customer / Agent picker. Used on Sign up, Sign in (Google) and
 * Complete Profile. Same control everywhere so the choice is
 * unmistakable and the value sent to the backend is always
 * `client` or `agent`.
 */
export default function RolePicker({ value, onChange, error, idPrefix = "role" }: RolePickerProps) {
  return (
    <div>
      <span className="field-label" id={`${idPrefix}-label`}>
        I am joining as
      </span>
      <div className="role-grid" role="radiogroup" aria-labelledby={`${idPrefix}-label`}>
        {ROLES.map((role) => {
          const selected = value === role.value;
          const Icon = role.value === "client" ? KeyRound : Home;
          return (
            <button
              key={role.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`role-card ${selected ? "selected" : ""}`}
              onClick={() => onChange(role.value)}
            >
              {selected && (
                <span className="role-check" aria-hidden>
                  <Check size={12} strokeWidth={3.5} />
                </span>
              )}
              <span className="role-icon">
                <Icon size={19} />
              </span>
              <b>{role.label}</b>
              <span>{role.blurb}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
