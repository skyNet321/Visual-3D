"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ColorPreset } from "@/types/colors";
import type { PanelTemplate, ProductTemplate } from "@/types/products";

type PreviewMode = "turn" | "tilt";

interface Opening3DModalProps {
  open: boolean;
  onClose: () => void;
  template: ProductTemplate;
  color: ColorPreset;
}

interface PanelController {
  update: (progress: number, mode: PreviewMode) => void;
}

function openingDescription(template: ProductTemplate) {
  switch (template.openingStyle) {
    case "tilt-and-turn":
      return "Поворотно-откидной режим: откид и полное боковое открывание.";
    case "fixed-plus-opening":
      return "Комбинация глухой панели и активной створки.";
    case "double-door-opening":
      return "Две створки открываются в противоположные стороны.";
    case "sliding-window":
    case "sliding-door":
      return "Раздвижная система с линейным ходом створки.";
    case "balcony-door":
      return "Балконная дверь с полноразмерным открыванием полотна.";
    case "single-door-opening":
      return "Одно полотно на петлях с плавным открыванием.";
    default:
      return "Предпросмотр механики открывания в 3D.";
  }
}

function createFrame(
  group: THREE.Group,
  width: number,
  height: number,
  depth: number,
  frameColor: THREE.ColorRepresentation,
) {
  const frameThickness = Math.max(width, height) * 0.06;
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: frameColor,
    roughness: 0.6,
    metalness: 0.18,
  });

  const topBottomGeometry = new THREE.BoxGeometry(width, frameThickness, depth);
  const leftRightGeometry = new THREE.BoxGeometry(frameThickness, height, depth);

  const top = new THREE.Mesh(topBottomGeometry, frameMaterial);
  top.position.set(0, height / 2 - frameThickness / 2, 0);
  group.add(top);

  const bottom = new THREE.Mesh(topBottomGeometry, frameMaterial);
  bottom.position.set(0, -height / 2 + frameThickness / 2, 0);
  group.add(bottom);

  const left = new THREE.Mesh(leftRightGeometry, frameMaterial);
  left.position.set(-width / 2 + frameThickness / 2, 0, 0);
  group.add(left);

  const right = new THREE.Mesh(leftRightGeometry, frameMaterial);
  right.position.set(width / 2 - frameThickness / 2, 0, 0);
  group.add(right);

  return {
    innerWidth: width - frameThickness * 2,
    innerHeight: height - frameThickness * 2,
    frameThickness,
  };
}

function createLeaf(
  panelWidth: number,
  panelHeight: number,
  depth: number,
  panel: PanelTemplate,
  color: ColorPreset,
) {
  const leaf = new THREE.Group();

  const outerMaterial = new THREE.MeshStandardMaterial({
    color: color.hex,
    roughness: 0.58,
    metalness: 0.2,
  });

  const leafMesh = new THREE.Mesh(
    new THREE.BoxGeometry(panelWidth, panelHeight, depth),
    outerMaterial,
  );
  leaf.add(leafMesh);

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#add3f1"),
    transparent: true,
    opacity: panel.kind === "fixed" ? 0.44 : 0.34,
    roughness: 0.1,
    metalness: 0,
    transmission: 0.35,
    thickness: 0.08,
  });

  const glassMesh = new THREE.Mesh(
    new THREE.BoxGeometry(panelWidth * 0.78, panelHeight * 0.78, depth * 0.3),
    glassMaterial,
  );
  glassMesh.position.z = depth * 0.12;
  leaf.add(glassMesh);

  if (panel.kind !== "fixed") {
    const handleGeometry = new THREE.CylinderGeometry(0.012, 0.012, panelHeight * 0.2, 14);
    const handleMaterial = new THREE.MeshStandardMaterial({ color: "#dbe2eb", metalness: 0.75, roughness: 0.2 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(
      panel.hingeSide === "right" ? -panelWidth * 0.35 : panelWidth * 0.35,
      0,
      depth * 0.42,
    );
    leaf.add(handle);
  }

  return leaf;
}

function buildProductScene(
  template: ProductTemplate,
  color: ColorPreset,
): { group: THREE.Group; controllers: PanelController[] } {
  const group = new THREE.Group();
  const controllers: PanelController[] = [];

  const aspect = template.defaultProportions.width / template.defaultProportions.height;
  const width = 2.5;
  const rawHeight = width / Math.max(aspect, 0.2);
  const height = Math.min(2.6, Math.max(1.25, rawHeight));
  const depth = 0.12;

  const frameData = createFrame(group, width, height, depth, color.hex);

  let cursorX = -frameData.innerWidth / 2;

  template.panelLayout.forEach((panel) => {
    const panelWidth = frameData.innerWidth * panel.widthRatio;
    const centerX = cursorX + panelWidth / 2;
    const leafWidth = Math.max(0.15, panelWidth - frameData.frameThickness * 0.15);
    const leafHeight = Math.max(0.2, frameData.innerHeight - frameData.frameThickness * 0.15);
    const leafDepth = depth * 0.56;

    const leaf = createLeaf(leafWidth, leafHeight, leafDepth, panel, color);

    if (panel.kind === "fixed") {
      leaf.position.set(centerX, 0, 0);
      group.add(leaf);
      cursorX += panelWidth;
      return;
    }

    if (panel.kind === "sliding") {
      const slider = new THREE.Group();
      slider.position.set(centerX, 0, 0);
      slider.add(leaf);
      group.add(slider);

      const direction = panel.slideDirection === "left" ? -1 : 1;
      const slideDistance = panelWidth * 0.72;

      controllers.push({
        update: (progress) => {
          slider.position.x = centerX + slideDistance * progress * direction;
        },
      });

      cursorX += panelWidth;
      return;
    }

    const hingeSide = panel.hingeSide ?? "left";
    const hingeLeft = hingeSide === "left";

    const pivot = new THREE.Group();
    pivot.position.set(centerX + (hingeLeft ? -leafWidth / 2 : leafWidth / 2), 0, 0);

    leaf.position.set(hingeLeft ? leafWidth / 2 : -leafWidth / 2, 0, 0);
    pivot.add(leaf);

    group.add(pivot);

    const isDoor = template.category === "doors";
    const baseOpenAngle = isDoor ? 95 : 72;

    controllers.push({
      update: (progress, mode) => {
        if (template.openingStyle === "tilt-and-turn" && mode === "tilt") {
          pivot.rotation.set(-THREE.MathUtils.degToRad(progress * 16), 0, 0);
          pivot.position.z = progress * 0.06;
          return;
        }

        pivot.position.z = 0;
        pivot.rotation.x = 0;
        const angle = THREE.MathUtils.degToRad(progress * baseOpenAngle);
        pivot.rotation.y = hingeLeft ? angle : -angle;
      },
    });

    cursorX += panelWidth;
  });

  return {
    group,
    controllers,
  };
}

export function Opening3DModal({ open, onClose, template, color }: Opening3DModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const [openProgress, setOpenProgress] = useState(0.55);
  const [mode, setMode] = useState<PreviewMode>("turn");
  const [rotation, setRotation] = useState({ x: -0.14, y: 0.3 });

  const progressRef = useRef(openProgress);
  const modeRef = useRef(mode);
  const rotationRef = useRef(rotation);

  useEffect(() => {
    progressRef.current = openProgress;
  }, [openProgress]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    if (!open || !canvasRef.current || !viewportRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const viewport = viewportRef.current;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.25, 5.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.82);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(3.2, 4.1, 5.5);

    const fillLight = new THREE.DirectionalLight(0xa3c0e5, 0.35);
    fillLight.position.set(-2.4, 1.6, 2.8);

    scene.add(ambientLight, keyLight, fillLight);

    const root = new THREE.Group();
    scene.add(root);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 6),
      new THREE.MeshStandardMaterial({
        color: "#e9f2fb",
        roughness: 0.95,
        metalness: 0,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.6;
    scene.add(floor);

    const { group, controllers } = buildProductScene(template, color);
    root.add(group);

    const resize = () => {
      const width = Math.max(viewport.clientWidth, 200);
      const height = Math.max(viewport.clientHeight, 220);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resize();

    const observer = new ResizeObserver(() => resize());
    observer.observe(viewport);

    let frameId = 0;

    const tick = () => {
      controllers.forEach((controller) => controller.update(progressRef.current, modeRef.current));
      root.rotation.x = rotationRef.current.x;
      root.rotation.y = rotationRef.current.y;

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.dispose();
      scene.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) {
          return;
        }

        node.geometry.dispose();

        if (Array.isArray(node.material)) {
          node.material.forEach((material) => material.dispose());
        } else {
          node.material.dispose();
        }
      });
    };
  }, [open, template, color]);

  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startRotationX: number;
    startRotationY: number;
  } | null>(null);

  const supportsTilt = template.openingStyle === "tilt-and-turn";

  const modeLabel = useMemo(() => {
    if (!supportsTilt) {
      return "Режим открывания";
    }

    return mode === "tilt" ? "Откидной режим" : "Поворотный режим";
  }, [mode, supportsTilt]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end bg-[rgba(4,12,25,0.62)]">
      <div className="w-full rounded-t-[30px] bg-white px-4 pb-7 pt-4 shadow-[0_-14px_44px_rgba(6,18,34,0.32)]">
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#d4e2f2]" />
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#113255]">3D предпросмотр открывания</h3>
            <p className="text-xs text-[#476486]">{template.name}</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-[#d2dff0] px-3 py-2 text-xs font-semibold text-[#3b5b7f]"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>

        <div
          ref={viewportRef}
          className="relative mb-3 h-[300px] overflow-hidden rounded-2xl border border-[#d3e3f5] bg-[linear-gradient(180deg,#f3f8ff_0%,#dfeaf8_100%)]"
          onPointerDown={(event) => {
            (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
            dragStateRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              startRotationX: rotationRef.current.x,
              startRotationY: rotationRef.current.y,
            };
          }}
          onPointerMove={(event) => {
            const state = dragStateRef.current;
            if (!state || state.pointerId !== event.pointerId) {
              return;
            }

            const deltaX = event.clientX - state.startX;
            const deltaY = event.clientY - state.startY;

            setRotation({
              y: state.startRotationY + deltaX * 0.006,
              x: Math.max(-0.6, Math.min(0.35, state.startRotationX + deltaY * 0.005)),
            });
          }}
          onPointerUp={(event) => {
            if (dragStateRef.current?.pointerId === event.pointerId) {
              dragStateRef.current = null;
            }
          }}
          onPointerCancel={(event) => {
            if (dragStateRef.current?.pointerId === event.pointerId) {
              dragStateRef.current = null;
            }
          }}
        >
          <canvas ref={canvasRef} className="h-full w-full touch-none" />
          <p className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-[rgba(7,22,43,0.56)] px-3 py-1 text-[11px] font-semibold text-[#d9e8ff]">
            Поворот: потяните пальцем
          </p>
        </div>

        <div className="mb-3 rounded-xl bg-[#f1f7ff] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.11em] text-[#6583a8]">
            {modeLabel}
          </p>
          <p className="mt-1 text-sm text-[#2f4f73]">{openingDescription(template)}</p>
        </div>

        {supportsTilt ? (
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                mode === "turn"
                  ? "bg-[#1f74c5] text-white"
                  : "border border-[#c7d8ec] bg-white text-[#35597e]"
              }`}
              onClick={() => setMode("turn")}
            >
              Поворот
            </button>
            <button
              type="button"
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                mode === "tilt"
                  ? "bg-[#1f74c5] text-white"
                  : "border border-[#c7d8ec] bg-white text-[#35597e]"
              }`}
              onClick={() => setMode("tilt")}
            >
              Откид
            </button>
          </div>
        ) : null}

        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(openProgress * 100)}
            onChange={(event) => setOpenProgress(Number(event.target.value) / 100)}
            className="h-2 w-full accent-[#1f74c5]"
          />
          <div className="mt-1 flex justify-between text-[11px] font-semibold text-[#5d7ea3]">
            <span>Закрыто</span>
            <span>{Math.round(openProgress * 100)}%</span>
            <span>Открыто</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-xl border border-[#ccddf0] bg-white px-3 py-2 text-sm font-semibold text-[#35587d]"
            onClick={() => setOpenProgress(0.35)}
          >
            Приоткрыть
          </button>
          <button
            type="button"
            className="rounded-xl border border-[#ccddf0] bg-white px-3 py-2 text-sm font-semibold text-[#35587d]"
            onClick={() => setOpenProgress(1)}
          >
            Открыть полностью
          </button>
        </div>
      </div>
    </div>
  );
}
