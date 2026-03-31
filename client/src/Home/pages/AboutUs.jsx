import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import usePublicSettings from "../../hooks/usePublicSettings";
import { hasHtmlContent } from "../../utils/richText";
import {
  DEFAULT_ABOUT_CARDS,
  DEFAULT_ABOUT_STORY_CONTENT,
  DEFAULT_ABOUT_STORY_TITLE,
  getAboutCardIconComponent,
  normalizeAboutCards,
} from "../../utils/aboutSection";

const Wheel = ({ position }) => (
  <group position={position} rotation={[Math.PI / 2, 0, 0]}>
    <mesh castShadow>
      <cylinderGeometry args={[0.26, 0.26, 0.18, 28]} />
      <meshStandardMaterial color="#0b0f19" roughness={0.55} metalness={0.2} />
    </mesh>
    <mesh castShadow>
      <cylinderGeometry args={[0.18, 0.18, 0.12, 24]} />
      <meshStandardMaterial color="#64748b" roughness={0.2} metalness={0.6} />
    </mesh>
    <mesh castShadow>
      <cylinderGeometry args={[0.06, 0.06, 0.08, 12]} />
      <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.5} />
    </mesh>
  </group>
);

const TruckModel = () => {
  return (
    <group position={[-0.4, 0.26, 0]}>
      {/* Trailer */}
      <RoundedBox
        args={[3.5, 1.2, 1.5]}
        radius={0.08}
        smoothness={10}
        position={[1.05, 0.55, 0]}
        castShadow
      >
        <meshPhysicalMaterial
          color="#f8fafc"
          roughness={0.25}
          metalness={0.15}
          clearcoat={0.4}
          clearcoatRoughness={0.4}
        />
      </RoundedBox>
      {/* Trailer panel */}
      {/* Chassis */}
      <RoundedBox
        args={[4.4, 0.18, 0.6]}
        radius={0.06}
        smoothness={6}
        position={[0.6, 0.18, 0]}
        castShadow
      >
        <meshStandardMaterial
          color="#111827"
          roughness={0.55}
          metalness={0.2}
        />
      </RoundedBox>
      {/* Cab */}
      <RoundedBox
        args={[1.2, 0.85, 1.45]}
        radius={0.1}
        smoothness={10}
        position={[-1.35, 0.45, 0]}
        castShadow
      >
        <meshPhysicalMaterial
          color="#2563eb"
          roughness={0.35}
          metalness={0.35}
          clearcoat={0.5}
          clearcoatRoughness={0.35}
        />
      </RoundedBox>
      <RoundedBox
        args={[0.8, 0.32, 1.38]}
        radius={0.08}
        smoothness={8}
        position={[-1.2, 0.9, 0]}
        castShadow
      >
        <meshPhysicalMaterial
          color="#1d4ed8"
          roughness={0.38}
          metalness={0.32}
          clearcoat={0.45}
          clearcoatRoughness={0.35}
        />
      </RoundedBox>
      {/* Windshield */}
      <RoundedBox
        args={[0.22, 0.35, 0.55]}
        radius={0.06}
        smoothness={6}
        position={[-1.68, 0.48, 0.35]}
        castShadow
      >
        <meshPhysicalMaterial
          color="#dbeafe"
          roughness={0.02}
          metalness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          transmission={0.2}
        />
      </RoundedBox>
      {/* Grill */}
      <RoundedBox
        args={[0.14, 0.3, 0.7]}
        radius={0.04}
        smoothness={6}
        position={[-1.86, 0.28, 0]}
        castShadow
      >
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.3} />
      </RoundedBox>
      {/* Headlights */}
      {[
        [-1.83, 0.3, 0.48],
        [-1.83, 0.3, -0.48],
      ].map((pos) => (
        <RoundedBox
          key={pos.join("-")}
          args={[0.06, 0.1, 0.18]}
          radius={0.02}
          smoothness={4}
          position={pos}
          castShadow
        >
          <meshStandardMaterial
            color="#fef3c7"
            emissive="#facc15"
            emissiveIntensity={0.6}
          />
        </RoundedBox>
      ))}
      {/* Side mirror */}
      <mesh position={[-1.55, 0.7, 0.8]} castShadow>
        <boxGeometry args={[0.22, 0.08, 0.04]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* Rear door (open) */}
      <RoundedBox
        args={[0.06, 1.1, 1.3]}
        radius={0.04}
        smoothness={6}
        position={[2.75, 0.55, 0.72]}
        rotation={[0, Math.PI / 2.2, 0]}
        castShadow
      >
        <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.1} />
      </RoundedBox>
      {/* Bumper */}
      <RoundedBox
        args={[0.2, 0.14, 1.2]}
        radius={0.03}
        smoothness={6}
        position={[-2.0, 0.1, 0]}
        castShadow
      >
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.2} />
      </RoundedBox>
      {/* Wheels */}
      {[
        [-1.3, 0.0, 0.78],
        [-1.3, 0.0, -0.78],
        [1.0, 0.0, 0.78],
        [1.0, 0.0, -0.78],
        [2.2, 0.0, 0.78],
        [2.2, 0.0, -0.78],
      ].map((pos) => (
        <Wheel key={pos.join("-")} position={pos} />
      ))}{" "}
    </group>
  );
};

const Pallet = ({ position, stack = 3 }) => {
  const boxes = useMemo(() => {
    const items = [];
    for (let y = 0; y < stack; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        for (let z = 0; z < 2; z += 1) {
          items.push([x * 0.34 - 0.17, 0.16 + y * 0.22, z * 0.34 - 0.17]);
        }
      }
    }
    return items;
  }, [stack]);

  return (
    <group position={position}>
      <RoundedBox
        args={[0.96, 0.1, 0.76]}
        radius={0.05}
        smoothness={6}
        castShadow
      >
        <meshStandardMaterial color="#c4a484" roughness={0.65} />
      </RoundedBox>
      {boxes.map((pos, index) => (
        <group key={index} position={pos}>
          <RoundedBox
            args={[0.3, 0.2, 0.3]}
            radius={0.04}
            smoothness={4}
            castShadow
          >
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.35}
              metalness={0.05}
            />
          </RoundedBox>
          <mesh position={[0, 0.02, 0.16]} castShadow>
            <boxGeometry args={[0.22, 0.05, 0.02]} />
            <meshStandardMaterial color="#22c55e" roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const MovingPallet = ({
  startX,
  endX,
  startY = 0,
  endY = 0.21,
  z,
  speed = 0.1,
  offset = 0,
}) => {
  const ref = useRef();

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() * speed + offset) % 1;
    const x = startX + (endX - startX) * t;
    const baseY = startY + (endY - startY) * t;
    const bob = Math.sin((t + offset) * Math.PI * 2) * 0.015;
    if (ref.current) {
      ref.current.position.set(x, baseY + bob, z);
    }
  });

  return (
    <group ref={ref}>
      <Pallet position={[0, 0, 0]} stack={2} />
    </group>
  );
};

const Worker = ({ position, rotation = [0, 0, 0], shirt = "#f59e0b" }) => (
  <group position={position} rotation={rotation}>
    <RoundedBox
      args={[0.36, 0.52, 0.24]}
      radius={0.1}
      smoothness={8}
      position={[0, 0.46, 0]}
      castShadow
    >
      <meshStandardMaterial color={shirt} roughness={0.35} />
    </RoundedBox>
    <mesh position={[0, 0.9, 0]} castShadow>
      <sphereGeometry args={[0.16, 24, 24]} />
      <meshStandardMaterial color="#f3c5a6" roughness={0.4} />
    </mesh>
    <mesh position={[0, 1.02, 0]} castShadow>
      <sphereGeometry args={[0.18, 24, 24]} />
      <meshStandardMaterial color="#facc15" roughness={0.35} />
    </mesh>
    <mesh position={[0.24, 0.52, 0]} castShadow>
      <capsuleGeometry args={[0.06, 0.26, 8, 16]} />
      <meshStandardMaterial color="#f3c5a6" />
    </mesh>
    <mesh position={[-0.24, 0.52, 0]} castShadow>
      <capsuleGeometry args={[0.06, 0.26, 8, 16]} />
      <meshStandardMaterial color="#f3c5a6" />
    </mesh>
    <mesh position={[0.12, 0.15, 0]} castShadow>
      <capsuleGeometry args={[0.07, 0.26, 8, 16]} />
      <meshStandardMaterial color="#1e3a8a" roughness={0.5} />
    </mesh>
    <mesh position={[-0.12, 0.15, 0]} castShadow>
      <capsuleGeometry args={[0.07, 0.26, 8, 16]} />
      <meshStandardMaterial color="#1e3a8a" roughness={0.5} />
    </mesh>
    <RoundedBox
      args={[0.18, 0.18, 0.18]}
      radius={0.04}
      smoothness={4}
      position={[0.34, 0.52, 0]}
      castShadow
    >
      <meshStandardMaterial color="#f8fafc" roughness={0.3} />
    </RoundedBox>
  </group>
);

const DeliveryScene = () => {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="relative z-10 h-[380px] w-full">
        <Canvas
          shadows
          gl={{ alpha: true, antialias: true }}
          camera={{ position: [5.2, 2.6, 5.5], fov: 40 }}
          style={{ height: "100%", width: "100%", background: "transparent" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <Environment preset="studio" />
          <ambientLight intensity={0.7} />
          <directionalLight
            intensity={1.2}
            position={[5, 6, 4]}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight intensity={0.6} position={[-4, 3, -2]} />

          <group position={[0, 0, 0]}>
            <TruckModel />

            {/* Soft contact shadow */}
            <ContactShadows
              position={[0.6, -0.02, 0]}
              opacity={0.35}
              blur={2.2}
              width={8}
              height={6}
              far={4}
            />

            {/* Static pallets (ground) */}
            <Pallet position={[3.7, 0, 1.0]} stack={3} />
            <Pallet position={[3.7, 0, -1.1]} stack={2} />

            {/* Cargo inside truck */}
            <Pallet position={[1.85, 0.21, 0.35]} stack={2} />
            <Pallet position={[1.85, 0.21, -0.35]} stack={2} />

            {/* Moving pallets into the truck */}
            <MovingPallet
              startX={4.3}
              endX={2.1}
              startY={0}
              endY={0.21}
              z={0.55}
              speed={0.12}
              offset={0.0}
            />
            <MovingPallet
              startX={4.0}
              endX={2.15}
              startY={0}
              endY={0.21}
              z={-0.55}
              speed={0.12}
              offset={0.45}
            />
            <MovingPallet
              startX={4.5}
              endX={2.25}
              startY={0}
              endY={0.21}
              z={0.0}
              speed={0.12}
              offset={0.75}
            />

            {/* Workers */}
            <Worker position={[2.8, 0, 1.6]} rotation={[0, Math.PI / 4, 0]} />
            <Worker
              position={[3.55, 0, -0.2]}
              rotation={[0, -Math.PI / 6, 0]}
              shirt="#fb923c"
            />
            <Worker
              position={[2.6, 0, -1.6]}
              rotation={[0, Math.PI / 2.2, 0]}
              shirt="#f97316"
            />
          </group>

          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.9}
            minPolarAngle={0.4}
            maxPolarAngle={1.4}
          />
        </Canvas>
      </div>
    </div>
  );
};

const AboutUs = () => {
  const { settings } = usePublicSettings();
  const storeName = String(settings?.website?.storeName || "E-Commerce").trim() || "E-Commerce";
  const tagline = String(settings?.website?.tagline || "").trim();
  const aboutStoryTitle =
    String(settings?.about?.storyTitle || "").trim() || DEFAULT_ABOUT_STORY_TITLE;
  const aboutStoryContent =
    String(settings?.about?.storyContent || "").trim() ||
    (tagline
      ? `<p>${tagline}</p><p>${storeName} now brings products, banners, categories, support, compare flows, wishlist behavior, and branded landing content into one office ecommerce system that feels much closer to a full marketplace experience.</p><p>Our mission is simple: give shoppers a more polished buying journey while giving operators a stronger control layer for stock, pricing, orders, and storefront presentation.</p>`
      : DEFAULT_ABOUT_STORY_CONTENT);
  const features = normalizeAboutCards(settings?.about?.cards || DEFAULT_ABOUT_CARDS);
  const cardsLayoutClass =
    features.length <= 1
      ? "mx-auto max-w-sm grid grid-cols-1"
      : features.length === 2
        ? "mx-auto max-w-4xl grid grid-cols-1 gap-6 md:grid-cols-2"
        : features.length === 3
          ? "mx-auto max-w-6xl grid grid-cols-1 gap-6 md:grid-cols-3"
          : "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4";

  return (
    <section className="min-h-screen bg-white">
      <div className="site-container py-16 md:py-20">
        <div className="mb-20 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-6 text-3xl font-bold text-black md:text-4xl">
              {aboutStoryTitle}
            </h2>
            {hasHtmlContent(aboutStoryContent) ? (
              <div
                className="prose max-w-none space-y-6 text-lg leading-relaxed text-gray-700"
                dangerouslySetInnerHTML={{ __html: aboutStoryContent }}
              />
            ) : (
              <div className="space-y-6">
                <p className="text-lg leading-relaxed text-gray-700">
                  {aboutStoryContent}
                </p>
              </div>
            )}
          </div>

          <DeliveryScene />
        </div>

        <div className="mb-10">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-black md:text-4xl">
              Shop With Confidence
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              We&apos;ve built the storefront around trust, clarity, and
              smoother customer decisions.
            </p>
          </div>

          <div className={cardsLayoutClass}>
            {features.map((feature, index) => (
              <div
                key={`${feature.title}-${index}`}
                className="group rounded-xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:border-black hover:shadow-xl"
              >
                {(() => {
                  const Icon = getAboutCardIconComponent(feature.icon);
                  return (
                    <div
                      className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: feature.backgroundColor || "#111827" }}
                    >
                      <div style={{ color: feature.iconColor || "#ffffff" }}>
                        <Icon className="text-2xl" />
                      </div>
                    </div>
                  );
                })()}
                <h3 className="mb-2 text-lg font-bold text-black">
                  {feature.title}
                </h3>
                {hasHtmlContent(feature.description) ? (
                  <div
                    className="space-y-3 text-sm leading-6 text-gray-600"
                    dangerouslySetInnerHTML={{ __html: feature.description }}
                  />
                ) : (
                  <p className="text-sm leading-6 text-gray-600">{feature.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
