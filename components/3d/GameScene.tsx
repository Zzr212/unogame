import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store';
import CardObject from './CardObject';
import { Card } from '../../types';
import { COLOR_MAP } from '../../constants';

// --- Sub-components ---

const Table = () => {
  return (
    <group position={[0, -2, 0]}>
      {/* Main Surface */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[11, 11, 0.5, 64]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>
      
      {/* Neon Rings */}
      {/* Outer Glow Ring */}
      <mesh position={[0, 0.26, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <ringGeometry args={[10.5, 10.8, 64]} />
         <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      
      {/* Mid Ring */}
      <mesh position={[0, 0.26, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <ringGeometry args={[7, 7.05, 64]} />
         <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      
       {/* Center Ring */}
      <mesh position={[0, 0.26, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <ringGeometry args={[2.5, 2.6, 64]} />
         <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={1} toneMapped={false} />
      </mesh>

      {/* Center Dot */}
      <mesh position={[0, 0.26, 0]}>
        <circleGeometry args={[0.2, 32]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
    </group>
  );
};

const DirectionIndicator = ({ direction }: { direction: number }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.z -= delta * direction * 1.5;
        }
    });

    return (
        <group position={[0, -1.73, 0]} rotation={[-Math.PI/2, 0, 0]} ref={ref}>
            {/* Using text arrows for simplicity, rotated in a circle */}
            <Text position={[0, 1.5, 0]} rotation={[0,0,-Math.PI/2]} fontSize={2} color="#3b82f6" fillOpacity={0.6}>➔</Text>
            <Text position={[0, -1.5, 0]} rotation={[0,0,Math.PI/2]} fontSize={2} color="#3b82f6" fillOpacity={0.6}>➔</Text>
        </group>
    );
};

const Avatar = ({ name, isThinking }: { name: string, isThinking: boolean }) => {
    return (
        <Billboard position={[0, 2, 0]}>
            <mesh position={[0, 0.5, 0]}>
                <planeGeometry args={[1.5, 1.5]} />
                <meshStandardMaterial color={isThinking ? "#fbbf24" : "#cbd5e1"} />
            </mesh>
            {/* Simple face placeholder */}
             <mesh position={[0, 0.5, 0.01]}>
                <planeGeometry args={[1.3, 1.3]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>
            <Text position={[0, 0.5, 0.02]} fontSize={0.8} color="white">
                {name.charAt(0).toUpperCase()}
            </Text>
            
            <Text position={[0, -0.6, 0]} fontSize={0.4} color="white" anchorY="top">
                {name}
            </Text>
        </Billboard>
    )
}

// --- Main Scene ---

const GameScene: React.FC = () => {
  const { players, discardPile, playCard, currentPlayerIndex, drawCard, currentColor, direction } = useGameStore();
  const localPlayer = players[0]; 

  // Curved Hand Logic
  const handPositions = useMemo(() => {
    if (!localPlayer) return [];
    const count = localPlayer.hand.length;
    const radius = 12; // Radius of the arc
    const arcAngle = Math.min(Math.PI / 3, count * 0.15); // Max 60 degrees spread
    
    return localPlayer.hand.map((_, i) => {
      // Calculate angle for this card centered around -PI/2 (bottom)
      // Normalize i from 0..count-1 to -0.5..0.5 range
      const normalizedIndex = i - (count - 1) / 2;
      const angle = -Math.PI / 2 - (normalizedIndex * (arcAngle / Math.max(1, count - 1)));
      
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle) * -1; // -1 to flip z
      const rotationY = -angle - Math.PI / 2;

      // Shift whole arc down and forward relative to camera
      return {
        position: [x, -3, z + 6] as [number, number, number],
        rotation: [-0.2, 0, rotationY] as [number, number, number] 
      };
    });
  }, [localPlayer?.hand?.length]);

  const getOpponentTransform = (playerIndex: number) => {
      // Fixed layout for 4 players
      const total = players.length;
      const relativeIndex = (playerIndex - 0 + total) % total;

      if (relativeIndex === 1) { // Right
          return { pos: [12, 0, 0], rot: [0, -Math.PI / 2, 0] }; 
      } else if (relativeIndex === 2) { // Top
          return { pos: [0, 0, -9], rot: [0, Math.PI, 0] };
      } else { // Left (relativeIndex === 3)
          return { pos: [-12, 0, 0], rot: [0, Math.PI / 2, 0] };
      }
  };

  const topDiscard = discardPile[discardPile.length - 1];

  return (
    <Canvas shadows camera={{ position: [0, 9, 14], fov: 40 }}>
      <color attach="background" args={['#020617']} />
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 15, 0]} intensity={1.5} distance={30} castShadow />
      <spotLight position={[0, 20, 10]} angle={0.5} penumbra={1} intensity={1} castShadow />
      
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
      
      {/* Table Group */}
      <Table />
      
      {/* Center Direction Indicator */}
      <DirectionIndicator direction={direction} />

      {/* Discard Pile (Top Card) */}
      {topDiscard && (
        <CardObject 
          card={topDiscard} 
          position={[0, 0, 0]} 
          rotation={[-Math.PI / 2, 0, Math.random() * 0.2]} 
        />
      )}
      
      {/* Draw Pile */}
      <group position={[2, 0, 0]} onClick={() => drawCard(localPlayer.id)}>
          <CardObject 
             card={{id: 'draw', color: 'black', value: '0'}} 
             position={[0, 0, 0]}
             rotation={[Math.PI / 2, 0, 0]}
             scale={1}
             isHoverable={players[currentPlayerIndex]?.id === localPlayer?.id}
          />
          {/* Deck thickness visual */}
          <mesh position={[0, -0.1, 0]} rotation={[Math.PI/2, 0, 0]}>
             <boxGeometry args={[1.2, 1.8, 0.2]} />
             <meshStandardMaterial color="#1f2937" />
             <mesh position={[0,0,0.11]}>
                <planeGeometry args={[1.1, 1.7]} />
                <meshStandardMaterial color="#374151" />
             </mesh>
          </mesh>
      </group>

      {/* Local Player Hand */}
      {localPlayer && localPlayer.hand.map((card, i) => (
        <CardObject
          key={card.id}
          card={card}
          position={handPositions[i]?.position || [0,0,0]}
          rotation={handPositions[i]?.rotation || [0,0,0]}
          isHoverable={players[currentPlayerIndex]?.id === localPlayer.id}
          onClick={() => playCard(localPlayer.id, card.id)}
        />
      ))}

      {/* Opponents */}
      {players.map((p, i) => {
        if (p.id === localPlayer?.id) return null;
        const { pos, rot } = getOpponentTransform(i);
        const isTurn = players[currentPlayerIndex]?.id === p.id;
        
        return (
          <group key={p.id} position={pos as any} rotation={rot as any}>
            <Avatar name={p.name} isThinking={isTurn} />
            
            {/* Cards arranged in a slight arc for opponents too */}
            <group position={[0, -1.5, 2]}>
                {Array.from({ length: Math.min(p.cardCount, 10) }).map((_, idx) => {
                     const angle = (idx - p.cardCount/2) * 0.1;
                     return (
                        <CardObject
                            key={`opp-${p.id}-${idx}`}
                            card={{id: 'hidden', color: 'black', value: '0'}}
                            position={[Math.sin(angle) * 2, 0, Math.cos(angle) * 0.5]}
                            rotation={[Math.PI / 2 - 0.2, 0, -angle]}
                        />
                     )
                })}
            </group>
          </group>
        );
      })}

      {/* Current Color Indicator (Floating Ring above Center) */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <ringGeometry args={[1.2, 1.3, 32]} />
         <meshBasicMaterial color={COLOR_MAP[currentColor]} />
      </mesh>

      <OrbitControls 
        enablePan={false} 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 2.5} 
        maxDistance={25}
        minDistance={10}
      />
    </Canvas>
  );
};

export default GameScene;