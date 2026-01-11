import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardColor } from '../../types';
import { CARD_WIDTH, CARD_HEIGHT, COLOR_MAP, getCardLabel } from '../../constants';

interface CardProps {
  card: Card;
  position: [number, number, number];
  rotation: [number, number, number];
  isHoverable?: boolean;
  onClick?: () => void;
  scale?: number;
}

const CardObject: React.FC<CardProps> = ({ card, position, rotation, isHoverable = false, onClick, scale = 1 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  // Smooth animation for hover
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const targetY = position[1] + (hovered && isHoverable ? 0.5 : 0);
    const targetScale = hovered && isHoverable ? scale * 1.1 : scale;
    
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, delta * 10);
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, delta * 10));
    
    // Basic rotation interpolation
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, rotation[0], delta * 5);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, rotation[1], delta * 5);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, rotation[2], delta * 5);
    
    // Position interpolation (x, z)
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, position[0], delta * 5);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, position[2], delta * 5);
  });

  const frontColor = COLOR_MAP[card.color] || '#ffffff';
  
  // Create textures/materials
  const boxArgs: [number, number, number] = [CARD_WIDTH, CARD_HEIGHT, 0.05];

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        rotation={rotation}
        onClick={(e) => {
          e.stopPropagation();
          onClick && onClick();
        }}
        onPointerOver={() => isHoverable && setHover(true)}
        onPointerOut={() => isHoverable && setHover(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={boxArgs} />
        {/* Materials: Right, Left, Top, Bottom, Front, Back */}
        <meshStandardMaterial attach="material-0" color="#f0f0f0" />
        <meshStandardMaterial attach="material-1" color="#f0f0f0" />
        <meshStandardMaterial attach="material-2" color="#f0f0f0" />
        <meshStandardMaterial attach="material-3" color="#f0f0f0" />
        
        {/* Front Face */}
        <meshStandardMaterial attach="material-4" color={frontColor} />
        
        {/* Back Face */}
        <meshStandardMaterial attach="material-5" color="#111111" />

        {/* Text on Front */}
        <Text
          position={[0, 0, 0.03]}
          fontSize={0.8}
          color="white"
          anchorX="center"
          anchorY="middle"
          rotation={[0, 0, 0]}
        >
          {getCardLabel(card.value)}
        </Text>

        {/* Small Corner Text Top Left */}
        <Text
          position={[-0.35, 0.6, 0.03]}
          fontSize={0.25}
          color="white"
        >
          {getCardLabel(card.value)}
        </Text>

         {/* Small Corner Text Bottom Right */}
         <Text
          position={[0.35, -0.6, 0.03]}
          fontSize={0.25}
          color="white"
          rotation={[0, 0, Math.PI]}
        >
          {getCardLabel(card.value)}
        </Text>

        {/* Text on Back (UNO Logo placeholder) */}
        <Text
          position={[0, 0, -0.03]}
          fontSize={0.6}
          color="#ffaa00"
          rotation={[0, Math.PI, 0]}
        >
          UNO
        </Text>
      </mesh>
    </group>
  );
};

export default CardObject;