/* Lucide icons, imported one by one so only these ship.
   Static markup: <i data-lucide="search"></i>, replaced by renderIcons().
   JS templates:  icon('search', 'size-4'). */
import {
  ChevronDown, UserRound, Package, ShieldCheck, LogOut, House, Search, Plus, ArrowUpRight, Mail, MapPin,
  ArrowRight, ArrowLeft, Calendar, Phone, Lock, User, X, Check, CircleAlert, CircleCheck, Info, ImagePlus,
  SlidersHorizontal, Trash2, Pencil, Camera, LoaderCircle, HandHeart, Pill, HeartHandshake, Send, Eye, Ban,
  RotateCcw, Users, FileText, Activity, Clock, Shield, RefreshCw, ChevronRight, ChevronLeft, TriangleAlert,
  MailCheck, BadgeCheck, Scale, FileWarning, Handshake, Database, UserCheck, CircleHelp, Upload, Hourglass,
  Inbox, ChartColumn, Sparkles, PackageOpen, KeyRound, Stethoscope, Copy, ArrowUp, Flag, Star,
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
  copy: Copy, 'arrow-up': ArrowUp, flag: Flag, star: Star,
  // The GitHub mark is a filled shape and not part of Lucide
  github: [['path', { d: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.194 22 16.442 22 12.017 22 6.484 17.522 2 12 2z', fill: 'currentColor', stroke: 'none' }]],
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
