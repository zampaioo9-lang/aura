import { useEffect, useState } from 'react';
import { Newspaper, Tag, Plus } from 'lucide-react';
import { useArticles, type Category, type CategoryAudience } from '../../hooks/useArticles';
import { useToast } from '../Toast';

export default function AdminRevista() {
  const { listCategories, createCategory, updateCategory } = useArticles();
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<'categorias' | 'articulos'>('articulos');
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newAudience, setNewAudience] = useState<CategoryAudience>('PACIENTES');
  const [creating, setCreating] = useState(false);

  const loadCategories = async () => {
    try {
      setCategories(await listCategories());
    } catch {
      toast('No se pudieron cargar las categorias', 'error');
    }
  };

  useEffect(() => { loadCategories(); }, []);

  const handleCreateCategory = async () => {
    if (newName.trim().length < 2) {
      toast('El nombre debe tener al menos 2 caracteres', 'error');
      return;
    }
    setCreating(true);
    try {
      await createCategory({ name: newName.trim(), audience: newAudience });
      setNewName('');
      await loadCategories();
      toast('Categoria creada', 'success');
    } catch {
      toast('No se pudo crear la categoria', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await updateCategory(category.id, { active: !category.active });
      await loadCategories();
    } catch {
      toast('No se pudo actualizar la categoria', 'error');
    }
  };

  const pacientes = categories.filter(c => c.audience === 'PACIENTES');
  const terapeutas = categories.filter(c => c.audience === 'TERAPEUTAS');

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setSubTab('articulos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${subTab === 'articulos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          <Newspaper size={15} /> Articulos
        </button>
        <button
          onClick={() => setSubTab('categorias')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${subTab === 'categorias' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          <Tag size={15} /> Categorias
        </button>
      </div>

      {subTab === 'categorias' && (
        <div>
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Nueva categoria</h3>
            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64"
                  placeholder="Ej. Ansiedad y estres"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Audiencia</label>
                <select
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value as CategoryAudience)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="PACIENTES">Pacientes</option>
                  <option value="TERAPEUTAS">Terapeutas</option>
                </select>
              </div>
              <button
                onClick={handleCreateCategory}
                disabled={creating}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={15} /> {creating ? 'Creando...' : 'Agregar'}
              </button>
            </div>
          </div>

          {([['Pacientes', pacientes], ['Terapeutas', terapeutas]] as const).map(([label, list]) => (
            <div key={label} className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">{label}</h3>
              <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
                {list.map(category => (
                  <div key={category.id} className="flex items-center justify-between px-4 py-3">
                    <span className={`text-sm ${category.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{category.name}</span>
                    <button
                      onClick={() => handleToggleActive(category)}
                      className={`text-xs font-medium px-3 py-1 rounded-full ${category.active ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {category.active ? 'Activa' : 'Inactiva'}
                    </button>
                  </div>
                ))}
                {list.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">Sin categorias aun.</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'articulos' && <div>{/* Task 8 fills this in */}</div>}
    </div>
  );
}
