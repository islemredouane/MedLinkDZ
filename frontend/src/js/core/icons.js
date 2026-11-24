/* Lucide icons, imported one by one so only these ship.
   Static markup: <i data-lucide="search"></i>, replaced by renderIcons().
   JS templates:  icon('search', 'size-4'). */
import {
  ChevronDown, UserRound, Package, ShieldCheck, LogOut, House, Search, Plus, ArrowUpRight, Mail, MapPin,
  ArrowRight, ArrowLeft, Calendar, Phone, Lock, User, X, Check, CircleAlert, CircleCheck, Info, ImagePlus,
  SlidersHorizontal, Trash2, Pencil, Camera, LoaderCircle, HandHeart, Pill, HeartHandshake, Send, Eye, Ban,
  RotateCcw, Users, FileText, Activity, Clock, Shield, RefreshCw, ChevronRight, ChevronLeft, TriangleAlert,
  MailCheck, BadgeCheck, Scale, FileWarning, Handshake, Database, UserCheck, CircleHelp, Upload, Hourglass,
  Inbox, ChartColumn, Sparkles, PackageOpen, KeyRound, Stethoscope, Copy, ArrowUp, Flag,
} from 'lucide';

const ICONS = {
  'chevron-down': ChevronDown, 'user-round': UserRound, package: Package, 'shield-check': ShieldCheck,
  'log-out': LogOut, house: House, search: Search, plus: Plus, 'arrow-up-right': ArrowUpRight, mail: Mail,
  'map-pin': MapPin, 'arrow-right': ArrowRight, 'arrow-left': ArrowLeft, calendar: Calendar, phone: Phone,
  lock: Lock, user: User, x: X, check: Check, 'circle-alert': CircleAlert, 'circle-check': CircleCheck,
  info: Info, 'image-plus': ImagePlus, 'sliders-horizontal': SlidersHorizontal, 'trash-2': Trash2,
  pencil: Pencil, camera: Camera, loader: LoaderCircle, 'hand-heart': HandHeart, pill: Pill,
  'heart-handshake': HeartHandshake, send: Send, eye: Eye, ban: Ban, 'rotate-ccw': RotateCcw, users: Users,
  'file-text': FileText, activity: Activity, clock: Clock, shield: Shield, 'refresh-cw': RefreshCw,
  'chevron-right': ChevronRight, 'chevron-left': ChevronLeft, 'triangle-alert': TriangleAlert,
  'mail-check': MailCheck, 'badge-check': BadgeCheck, scale: Scale, 'file-warning': FileWarning,
  handshake: Handshake, database: Database, 'user-check': UserCheck, 'circle-help': CircleHelp, upload: Upload,
  hourglass: Hourglass, inbox: Inbox, 'chart-column': ChartColumn, sparkles: Sparkles,
  'package-open': PackageOpen, 'key-round': KeyRound, stethoscope: Stethoscope,
  copy: Copy, 'arrow-up': ArrowUp, flag: Flag,
};

const attrs = (o) => Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(' ');

/** SVG markup for an icon. */
export function icon(name, cls = '') {
  const node = ICONS[name];
  if (!node) return '';
  const children = node.map(([tag, a]) => `<${tag} ${attrs(a)}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="${cls}">${children}</svg>`;
}

/** Replace every <i data-lucide="…"> inside root with its SVG (keeps the element's classes). */
export function renderIcons(root = document) {
  root.querySelectorAll('i[data-lucide]').forEach((el) => {
    const svg = icon(el.dataset.lucide, el.getAttribute('class') || '');
    if (svg) el.outerHTML = svg;
  });
}
