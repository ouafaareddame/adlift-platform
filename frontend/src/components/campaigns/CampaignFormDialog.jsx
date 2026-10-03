import { Button } from "@/components/ui/Button";
import { CampaignModal } from "@/components/campaigns/CampaignModal";
import { TYPES, TYPE_LABEL, fieldClass, toPayload } from "@/lib/campaigns";

export function CampaignFormDialog({ editing, form, setForm, pending, onClose, onSubmit }) {
  return (
    <CampaignModal title={editing ? "Edit campaign" : "New campaign"} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(toPayload(form));
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Name
          <input
            required
            className={fieldClass}
            placeholder="Spring newsletter"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Description
          <textarea
            className={fieldClass}
            rows={3}
            placeholder="Optional"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Type
          <select
            className={fieldClass}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {TYPES.map((item) => (
              <option key={item} value={item}>
                {TYPE_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            From
            <input
              required
              type="date"
              className={fieldClass}
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            To
            <input
              required
              type="date"
              className={fieldClass}
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Budget (MAD)
          <input
            required
            type="number"
            min="0"
            step="0.01"
            className={fieldClass}
            placeholder="0.00"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
          />
        </label>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Create campaign"}
        </Button>
      </form>
    </CampaignModal>
  );
}
