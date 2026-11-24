import '../core/layout.js';
import { requireAuth, setUser, initials, userWilayaId } from '../core/auth.js';
import { authApi, assetUrl, errorMessage } from '../core/api.js';
import { $, esc } from '../core/dom.js';
import { bindForm } from '../core/forms.js';
import { wilayaSelect } from '../components/wilaya-select.js';
import { toast } from '../core/toast.js';

const user = await requireAuth();
const form = $('[data-form]');
let avatarFile = null;
let previewUrl = null;

form.prenom.value = user.prenom || '';
form.nom.value = user.nom || '';
form.phone.value = user.phone || '';
$('[data-email]').value = user.email || '';
const wilaya = wilayaSelect($('[data-wilaya]'), { value: userWilayaId(user), placeholder: 'Choisir une wilaya' });

const paintAvatar = () => {
  const src = previewUrl || assetUrl(user.avatar_url);
  $('[data-avatar]').innerHTML = src ? `<img src="${esc(src)}" alt="" class="size-full object-cover">` : esc(initials(user));
};
paintAvatar();

$('[data-pick]').addEventListener('click', () => $('[data-file]').click());
$('[data-file]').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  // Same rules as the backend upload middleware: JPG/PNG/WebP, 5 MB max
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    toast(file.size > 5 * 1024 * 1024 ? 'Image trop lourde : 5 Mo maximum.' : 'Format non accepté : JPG, PNG ou WebP.', 'error');
    e.target.value = '';
    return;
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  avatarFile = file;
  previewUrl = URL.createObjectURL(file);
  paintAvatar();
});

bindForm(form, async (data, ui) => {
  try {
    const fd = new FormData();
    fd.append('prenom', data.prenom.trim());
    fd.append('nom', data.nom.trim());
    fd.append('phone', data.phone.trim());
    fd.append('wilaya', wilaya.value || '');
    if (avatarFile) fd.append('avatar', avatarFile);
    const res = await authApi.updateProfile(fd);
    if (res?.user) setUser(res.user);
    toast('Profil mis à jour', 'success');
    setTimeout(() => location.replace('/profil'), 600);
  } catch (err) {
    ui.notice('error', 'Enregistrement impossible', errorMessage(err, "Impossible d'enregistrer les modifications."));
  }
});
