import type { ProductTemplate } from "@/types/products";

const windowFrame = {
  frameThickness: 0.085,
  mullionThickness: 0.045,
  glassOpacity: 0.26,
  cornerRadius: 8,
  depthHint: 0.12,
};

const doorFrame = {
  frameThickness: 0.09,
  mullionThickness: 0.05,
  glassOpacity: 0.2,
  cornerRadius: 8,
  depthHint: 0.14,
};

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: "window-single-sash",
    category: "windows",
    name: "Одностворчатое окно",
    panels: 1,
    openingStyle: "side-opening",
    defaultProportions: { width: 1200, height: 1200 },
    frameStyle: windowFrame,
    panelLayout: [
      {
        id: "p1",
        label: "Створка",
        kind: "opening",
        widthRatio: 1,
        hingeSide: "left",
      },
    ],
    marketingTagline: "Классическое ПВХ окно для жилых комнат",
  },
  {
    id: "window-double-sash",
    category: "windows",
    name: "Двухстворчатое окно",
    panels: 2,
    openingStyle: "side-opening",
    defaultProportions: { width: 1600, height: 1200 },
    frameStyle: windowFrame,
    panelLayout: [
      {
        id: "p1",
        label: "Левая створка",
        kind: "opening",
        widthRatio: 0.5,
        hingeSide: "left",
      },
      {
        id: "p2",
        label: "Правая створка",
        kind: "opening",
        widthRatio: 0.5,
        hingeSide: "right",
      },
    ],
    marketingTagline: "Баланс света и удобного проветривания",
  },
  {
    id: "window-triple-sash",
    category: "windows",
    name: "Трехстворчатое окно",
    panels: 3,
    openingStyle: "side-opening",
    defaultProportions: { width: 2200, height: 1300 },
    frameStyle: windowFrame,
    panelLayout: [
      {
        id: "p1",
        label: "Левая створка",
        kind: "opening",
        widthRatio: 0.33,
        hingeSide: "left",
      },
      {
        id: "p2",
        label: "Центральная панель",
        kind: "fixed",
        widthRatio: 0.34,
      },
      {
        id: "p3",
        label: "Правая створка",
        kind: "opening",
        widthRatio: 0.33,
        hingeSide: "right",
      },
    ],
    marketingTagline: "Панорамный формат для больших проемов",
  },
  {
    id: "window-fixed-opening",
    category: "windows",
    name: "Глухая + открывающаяся секция",
    panels: 2,
    openingStyle: "fixed-plus-opening",
    defaultProportions: { width: 1500, height: 1200 },
    frameStyle: windowFrame,
    panelLayout: [
      {
        id: "p1",
        label: "Глухая секция",
        kind: "fixed",
        widthRatio: 0.45,
      },
      {
        id: "p2",
        label: "Открывающаяся секция",
        kind: "opening",
        widthRatio: 0.55,
        hingeSide: "right",
      },
    ],
    marketingTagline: "Практичное решение с увеличенной зоной остекления",
  },
  {
    id: "window-tilt-turn",
    category: "windows",
    name: "Поворотно-откидное окно",
    panels: 1,
    openingStyle: "tilt-and-turn",
    defaultProportions: { width: 1200, height: 1300 },
    frameStyle: windowFrame,
    panelLayout: [
      {
        id: "p1",
        label: "Поворотно-откидная створка",
        kind: "opening",
        widthRatio: 1,
        hingeSide: "left",
        supportsTilt: true,
      },
    ],
    marketingTagline: "Два режима открывания для комфортного микроклимата",
  },
  {
    id: "window-balcony",
    category: "windows",
    name: "Балконный блок (окно)",
    panels: 2,
    openingStyle: "fixed-plus-opening",
    defaultProportions: { width: 1800, height: 2100 },
    frameStyle: windowFrame,
    panelLayout: [
      {
        id: "p1",
        label: "Оконная секция",
        kind: "fixed",
        widthRatio: 0.45,
      },
      {
        id: "p2",
        label: "Балконная секция",
        kind: "opening",
        widthRatio: 0.55,
        hingeSide: "right",
      },
    ],
    marketingTagline: "Удобный балконный комплект с теплой рамой",
  },
  {
    id: "window-sliding",
    category: "windows",
    name: "Раздвижное ПВХ окно",
    panels: 2,
    openingStyle: "sliding-window",
    defaultProportions: { width: 1800, height: 1200 },
    frameStyle: windowFrame,
    panelLayout: [
      {
        id: "p1",
        label: "Левая створка",
        kind: "sliding",
        widthRatio: 0.5,
        slideDirection: "right",
      },
      {
        id: "p2",
        label: "Правая створка",
        kind: "sliding",
        widthRatio: 0.5,
        slideDirection: "left",
      },
    ],
    marketingTagline: "Экономия пространства и современный вид",
  },
  {
    id: "door-single-entrance",
    category: "doors",
    name: "Одностворчатая входная ПВХ дверь",
    panels: 1,
    openingStyle: "single-door-opening",
    defaultProportions: { width: 950, height: 2100 },
    frameStyle: doorFrame,
    panelLayout: [
      {
        id: "p1",
        label: "Дверное полотно",
        kind: "opening",
        widthRatio: 1,
        hingeSide: "left",
      },
    ],
    marketingTagline: "Надежная входная система с герметичным прижимом",
  },
  {
    id: "door-glass-panel",
    category: "doors",
    name: "ПВХ дверь со стеклопакетом",
    panels: 1,
    openingStyle: "single-door-opening",
    defaultProportions: { width: 950, height: 2100 },
    frameStyle: { ...doorFrame, glassOpacity: 0.32 },
    panelLayout: [
      {
        id: "p1",
        label: "Дверь со стеклом",
        kind: "opening",
        widthRatio: 1,
        hingeSide: "right",
      },
    ],
    marketingTagline: "Больше света для входной группы",
  },
  {
    id: "door-double",
    category: "doors",
    name: "Двустворчатая ПВХ дверь",
    panels: 2,
    openingStyle: "double-door-opening",
    defaultProportions: { width: 1700, height: 2200 },
    frameStyle: doorFrame,
    panelLayout: [
      {
        id: "p1",
        label: "Левое полотно",
        kind: "opening",
        widthRatio: 0.5,
        hingeSide: "left",
      },
      {
        id: "p2",
        label: "Правое полотно",
        kind: "opening",
        widthRatio: 0.5,
        hingeSide: "right",
      },
    ],
    marketingTagline: "Широкий проход для террас и коммерческих входов",
  },
  {
    id: "door-sliding",
    category: "doors",
    name: "Раздвижная ПВХ дверь",
    panels: 2,
    openingStyle: "sliding-door",
    defaultProportions: { width: 2000, height: 2200 },
    frameStyle: doorFrame,
    panelLayout: [
      {
        id: "p1",
        label: "Неподвижная секция",
        kind: "fixed",
        widthRatio: 0.5,
      },
      {
        id: "p2",
        label: "Раздвижная секция",
        kind: "sliding",
        widthRatio: 0.5,
        slideDirection: "left",
      },
    ],
    marketingTagline: "Портальная система для больших проемов",
  },
  {
    id: "door-balcony",
    category: "doors",
    name: "Балконная ПВХ дверь",
    panels: 1,
    openingStyle: "balcony-door",
    defaultProportions: { width: 850, height: 2100 },
    frameStyle: { ...doorFrame, glassOpacity: 0.35 },
    panelLayout: [
      {
        id: "p1",
        label: "Балконное полотно",
        kind: "opening",
        widthRatio: 1,
        hingeSide: "left",
      },
    ],
    marketingTagline: "Теплая балконная дверь с комфортным ходом",
  },
  {
    id: "door-terrace",
    category: "doors",
    name: "Террасная ПВХ дверь",
    panels: 2,
    openingStyle: "sliding-door",
    defaultProportions: { width: 2200, height: 2200 },
    frameStyle: doorFrame,
    panelLayout: [
      {
        id: "p1",
        label: "Левая секция",
        kind: "sliding",
        widthRatio: 0.5,
        slideDirection: "right",
      },
      {
        id: "p2",
        label: "Правая секция",
        kind: "fixed",
        widthRatio: 0.5,
      },
    ],
    marketingTagline: "Плавный выход на террасу без потери тепла",
  },
];

export const PRODUCT_CATEGORIES = [
  { id: "windows", label: "ПВХ окна" },
  { id: "doors", label: "ПВХ двери" },
] as const;

export function getTemplatesByCategory(category: "windows" | "doors") {
  return PRODUCT_TEMPLATES.filter((item) => item.category === category);
}

export function getTemplateById(templateId: string) {
  return PRODUCT_TEMPLATES.find((item) => item.id === templateId);
}
