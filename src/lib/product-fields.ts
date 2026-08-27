/**
 * تعريفات الحقول المخصّصة للمنتج (نظام موازٍ لمصفوفة التركيبات).
 * مشترك بين لوحة الإدارة (باني الحقول) وواجهة المتجر (عرض الحقول).
 */

export type FieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "single_select"
  | "multi_select"
  | "image"
  | "file"
  | "date"
  | "time"
  | "datetime"
  | "location"
  | "color"
  | "separator";

/** قيمة واحدة داخل حقل اختيار — لها سعر إضافي تراكمي */
export interface FieldOption {
  label: string;
  price: number;
}

/** شكل الحقل كما يُخزَّن ويُتبادَل عبر الـ API */
export interface ProductFieldData {
  id?: string;
  /** مفتاح ثابت فريد داخل المنتج — تشير إليه قواعد شرط الظهور */
  key: string;
  type: FieldType;
  label: string;
  description?: string | null;
  required: boolean;
  sortOrder: number;
  /** لأنواع الاختيار فقط */
  values?: FieldOption[];
  /** إعدادات إضافية: { extensions } لرفع الملف/الصورة */
  config?: { extensions?: string[] } | null;
  /** شرط الظهور: يظهر الحقل فقط لو الحقل ذو المفتاح condFieldKey = condValue */
  condFieldKey?: string | null;
  condValue?: string | null;
}

interface FieldTypeMeta {
  type: FieldType;
  labelAr: string;
  /** اسم أيقونة lucide-react */
  icon: string;
  /** هل يملك قائمة قيم (اختيار)؟ */
  hasValues: boolean;
  /** هل يقبل امتدادات ملفات؟ */
  hasExtensions: boolean;
  /** هل عنصر شكلي بلا إدخال (فاصل)؟ */
  presentational: boolean;
}

/** ترتيب القائمة يطابق قائمة "إضافة حقل جديد" في سلة */
export const FIELD_TYPES: FieldTypeMeta[] = [
  { type: "short_text", labelAr: "حقل نصي صغير", icon: "Type", hasValues: false, hasExtensions: false, presentational: false },
  { type: "long_text", labelAr: "حقل نصي كبير", icon: "AlignLeft", hasValues: false, hasExtensions: false, presentational: false },
  { type: "number", labelAr: "حقل رقمي", icon: "Hash", hasValues: false, hasExtensions: false, presentational: false },
  { type: "single_select", labelAr: "خيارات (اختيار واحد)", icon: "ListChecks", hasValues: true, hasExtensions: false, presentational: false },
  { type: "multi_select", labelAr: "خيارات (عدة اختيارات)", icon: "List", hasValues: true, hasExtensions: false, presentational: false },
  { type: "image", labelAr: "رفع صورة", icon: "ImagePlus", hasValues: false, hasExtensions: true, presentational: false },
  { type: "file", labelAr: "رفع ملف", icon: "Paperclip", hasValues: false, hasExtensions: true, presentational: false },
  { type: "date", labelAr: "حقل تاريخ", icon: "Calendar", hasValues: false, hasExtensions: false, presentational: false },
  { type: "time", labelAr: "حقل وقت", icon: "Clock", hasValues: false, hasExtensions: false, presentational: false },
  { type: "datetime", labelAr: "حقل موعد (تاريخ ووقت)", icon: "CalendarClock", hasValues: false, hasExtensions: false, presentational: false },
  { type: "location", labelAr: "تحديد موقع", icon: "MapPin", hasValues: false, hasExtensions: false, presentational: false },
  { type: "color", labelAr: "تحديد لون", icon: "Palette", hasValues: false, hasExtensions: false, presentational: false },
  { type: "separator", labelAr: "فاصل", icon: "Minus", hasValues: false, hasExtensions: false, presentational: true },
];

const META = Object.fromEntries(FIELD_TYPES.map((f) => [f.type, f])) as Record<FieldType, FieldTypeMeta>;

export function fieldMeta(type: FieldType): FieldTypeMeta {
  return META[type] ?? FIELD_TYPES[0];
}

export const isSelectType = (type: FieldType) => type === "single_select" || type === "multi_select";
export const hasExtensions = (type: FieldType) => fieldMeta(type).hasExtensions;
export const isPresentational = (type: FieldType) => fieldMeta(type).presentational;

/** الامتدادات المسموح بها افتراضياً لكل نوع رفع */
export const DEFAULT_EXTENSIONS: Record<string, string[]> = {
  image: ["jpg", "jpeg", "png", "webp"],
  file: ["pdf", "png", "jpg", "jpeg"],
};

/**
 * هل يجب إظهار الحقل بالنظر إلى القيم المختارة حالياً؟
 * القيم مفهرسة بمفتاح الحقل (key → القيمة المختارة كنص).
 */
export function isFieldVisible(field: ProductFieldData, values: Record<string, unknown>): boolean {
  if (!field.condFieldKey) return true;
  const current = values[field.condFieldKey];
  if (Array.isArray(current)) return current.map(String).includes(String(field.condValue));
  return String(current ?? "") === String(field.condValue ?? "");
}

/** السعر الإضافي لقيمة/قيم مختارة في حقل اختيار */
export function selectedPrice(field: ProductFieldData, value: unknown): number {
  if (!isSelectType(field.type) || !field.values) return 0;
  const chosen = Array.isArray(value) ? value.map(String) : [String(value ?? "")];
  return field.values
    .filter((v) => chosen.includes(v.label))
    .reduce((sum, v) => sum + (Number(v.price) || 0), 0);
}
