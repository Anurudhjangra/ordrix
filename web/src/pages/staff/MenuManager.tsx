import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api';
import { formatPaise } from '../../lib/format';
import { Alert, Button, Field, Input, Loader, Modal, SectionTitle, Textarea } from '../../components/ui';

interface Row {
  id: string;
  name: string;
  is_active: number;
  sort_order?: number;
}
interface CategoryRow extends Row {
  cafe_id: string;
}
interface ItemRow extends Row {
  cafe_id: string;
  category_id: string;
  description: string | null;
  image_url: string | null;
  price_paise: number;
  is_veg: number;
  is_available: number;
  prep_minutes: number;
}
interface OptionRow {
  id: string;
  menu_item_id: string;
  group_name: string;
  name: string;
  price_delta_paise: number;
  sort_order: number;
}

interface MenuData {
  categories: CategoryRow[];
  items: ItemRow[];
}

export function StaffMenuPage() {
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [catModal, setCatModal] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newItemCategoryId, setNewItemCategoryId] = useState<string | null>(null);
  const [optionModal, setOptionModal] = useState<ItemRow | null>(null);

  const load = useCallback(async () => {
    try {
      const cafeIdRes = await apiGet<{ cafeId: string }>('/api/staff/dashboard');
      setCafeId(cafeIdRes.cafeId);
      const [m, pub] = await Promise.all([
        apiGet<MenuData>(`/api/staff/menu?cafeId=${cafeIdRes.cafeId}`),
        apiGet<{ options: OptionRow[] }>(`/api/cafes/${cafeIdRes.cafeId}/menu`),
      ]);
      setMenu(m);
      setOptions(pub.options);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loader label="Loading menu…" />;
  if (!menu) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <SectionTitle title="Menu manager" subtitle="Categories, items, options, and availability." />
      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}

      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="accent" onClick={() => setCatModal(true)}>
          New category
        </Button>
        <Button variant="outline" onClick={() => { setNewItemCategoryId(null); setNewItemOpen(true); }}>
          New item
        </Button>
      </div>

      <div className="grid gap-6">
        {menu.categories.filter((c) => c.is_active === 1).map((cat) => {
          const catItems = menu.items.filter((i) => i.category_id === cat.id);
          return (
            <section key={cat.id} className="card">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-coffee-800">{cat.name}</h3>
                <Button size="sm" variant="outline" onClick={() => { setNewItemCategoryId(cat.id); setNewItemOpen(true); }}>
                  + Item
                </Button>
              </div>
              {catItems.length === 0 ? (
                <p className="text-sm text-stone-400">No items in this category yet.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {catItems.map((item) => (
                    <li key={item.id} className="rounded-xl border border-coffee-100 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-semibold ${item.is_available ? 'text-coffee-900' : 'text-stone-400 line-through'}`}>
                            {item.name}
                          </p>
                          <p className="text-xs text-stone-500">
                            {formatPaise(item.price_paise)} · {item.prep_minutes} min · {item.is_veg ? 'veg' : 'non-veg'}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-coffee-700">{formatPaise(item.price_paise)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={item.is_available ? 'outline' : 'primary'}
                          onClick={() => toggleAvailability(item)}
                        >
                          {item.is_available ? 'Sold out' : 'Available'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setOptionModal(item)}>
                          Options ({options.filter((o) => o.menu_item_id === item.id).length})
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => hideItem(item)}>
                          Hide
                        </Button>
                      </div>
                      {options.filter((o) => o.menu_item_id === item.id).length ? (
                        <p className="mt-2 text-xs text-stone-400">
                          {options.filter((o) => o.menu_item_id === item.id).map((o) => `${o.name}${o.price_delta_paise ? ` +${formatPaise(o.price_delta_paise)}` : ''}`).join(' · ')}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {catModal ? <CategoryModal cafeId={cafeId!} onClose={() => setCatModal(false)} onSaved={load} /> : null}
      {newItemOpen ? (
        <ItemModal cafeId={cafeId!} categoryId={newItemCategoryId} categories={menu.categories} onClose={() => setNewItemOpen(false)} onSaved={load} />
      ) : null}
      {optionModal ? <OptionModal item={optionModal} onClose={() => setOptionModal(null)} onSaved={load} /> : null}
    </div>
  );

  async function toggleAvailability(item: ItemRow) {
    if (!cafeId) return;
    try {
      await apiPatch(`/api/staff/menu/items/${item.id}`, { cafeId, isAvailable: item.is_available !== 1 });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function hideItem(item: ItemRow) {
    if (!cafeId) return;
    try {
      await apiDelete(`/api/staff/menu/items/${item.id}?cafeId=${cafeId}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
}

function CategoryModal({ cafeId, onClose, onSaved }: { cafeId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiPost('/api/staff/menu/categories', { cafeId, name });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="New category">
      {error ? <div className="mb-3"><Alert>{error}</Alert></div> : null}
      <Field label="Category name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frappes" />
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" loading={busy} onClick={submit}>Create</Button>
      </div>
    </Modal>
  );
}

function ItemModal({ cafeId, categoryId, categories, onClose, onSaved }: { cafeId: string; categoryId: string | null; categories: CategoryRow[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ categoryId: categoryId ?? categories[0]?.id ?? '', name: '', description: '', pricePaise: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiPost('/api/staff/menu/items', {
        cafeId,
        categoryId: form.categoryId,
        name: form.name,
        description: form.description || null,
        pricePaise: Math.round(Number(form.pricePaise)),
        isVeg: true,
        isAvailable: true,
        prepMinutes: 5,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="New item">
      {error ? <div className="mb-3"><Alert>{error}</Alert></div> : null}
      <div className="grid gap-3">
        <Field label="Category">
          <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mocha Frappe" />
        </Field>
        <Field label="Description">
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description (optional)" />
        </Field>
        <Field label="Price (in rupees)">
          <Input type="number" min={0} step="0.5" value={form.pricePaise} onChange={(e) => setForm({ ...form, pricePaise: e.target.value })} placeholder="180" />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" loading={busy} onClick={submit}>Create item</Button>
      </div>
    </Modal>
  );
}

function OptionModal({ item, onClose, onSaved }: { item: ItemRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ groupName: 'Options', name: '', priceDeltaPaise: '0' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/staff/menu/items/${item.id}/options`, {
        groupName: form.groupName,
        name: form.name,
        priceDeltaPaise: Math.round(Number(form.priceDeltaPaise)),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={`Add option · ${item.name}`}>
      {error ? <div className="mb-3"><Alert>{error}</Alert></div> : null}
      <div className="grid gap-3">
        <Field label="Group (e.g. Size, Milk, Toppings)">
          <Input value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} placeholder="Size" />
        </Field>
        <Field label="Option name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Large" />
        </Field>
        <Field label="Price delta (in rupees, can be negative)">
          <Input type="number" value={form.priceDeltaPaise} onChange={(e) => setForm({ ...form, priceDeltaPaise: e.target.value })} placeholder="20" />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" loading={busy} onClick={submit}>Add option</Button>
      </div>
    </Modal>
  );
}