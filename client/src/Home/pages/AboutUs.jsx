import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { FiTruck, FiShield, FiRefreshCw, FiPackage } from "react-icons/fi";

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
  const features = [
    {
      icon: <FiTruck className="text-2xl" />,
      title: "Fast Shipping",
      description:
        "Free shipping on orders over $50. 2-3 day delivery guaranteed.",
      stat: "24-72 hrs",
      color: "from-blue-500 to-blue-700",
    },
    {
      icon: <FiShield className="text-2xl" />,
      title: "Secure Payment",
      description:
        "256-bit SSL encryption. Your payment information is always safe.",
      stat: "100% Safe",
      color: "from-green-500 to-green-700",
    },
    {
      icon: <FiRefreshCw className="text-2xl" />,
      title: "Easy Returns",
      description: "30-day return policy. No questions asked on unworn items.",
      stat: "30 Days",
      color: "from-purple-500 to-purple-700",
    },
    {
      icon: <FiPackage className="text-2xl" />,
      title: "Quality Products",
      description:
        "Every product is quality-checked before shipping to ensure perfection.",
      stat: "10k+ Items",
      color: "from-amber-500 to-amber-700",
    },
  ];

  return (
    <section className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
              Our Story
            </h2>
            <div className="space-y-6">
              <p className="text-gray-700 text-lg leading-relaxed">
                What started as a passion project between friends has grown into
                one of the most trusted online shopping destinations. We noticed
                a gap in the market for quality products with exceptional
                customer service, and we decided to fill it.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed">
                Today, we work with over 150 premium brands to bring you
                carefully curated collections across fashion, electronics, home
                goods, and lifestyle products. Every item in our store is
                handpicked for quality, value, and style.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed">
                Our mission is simple: to make premium shopping accessible to
                everyone while maintaining the highest standards of quality and
                service.
              </p>
            </div>
          </div>

          <DeliveryScene />
        </div>

        <div className="mb-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              Shop With Confidence
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              We've built our entire platform around your peace of mind
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-xl hover:border-black transition-all duration-300 group"
              >
                <div
                  className={`w-12 h-12 rounded-lg bg-linear-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <div className="text-white">{feature.icon}</div>
                </div>
                <div className="text-2xl font-bold text-black mb-2">
                  {feature.stat}
                </div>
                <h3 className="text-lg font-bold text-black mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
