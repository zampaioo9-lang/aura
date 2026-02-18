import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Particle {
  anim: Animated.Value;
  x: number;
  y: number;
  radius: number;
  size: number;
  opacity: number;
  duration: number;
}

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    anim: new Animated.Value(0),
    x: Math.random() * SCREEN_W,
    y: Math.random() * SCREEN_H,
    radius: 30 + Math.random() * 60,
    size: 2 + Math.random() * 3,
    opacity: 0.15 + Math.random() * 0.3,
    duration: 8000 + Math.random() * 12000,
  }));
}

export default function FloatingParticles() {
  const particles = useRef(createParticles(12)).current;
  const { isDark, colors } = useTheme();

  useEffect(() => {
    particles.forEach((p) => {
      Animated.loop(
        Animated.timing(p.anim, {
          toValue: 1,
          duration: p.duration,
          useNativeDriver: true,
        }),
      ).start();
    });
  }, []);

  const particleOpacityScale = isDark ? 1 : 0.4;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.glow, { backgroundColor: isDark ? 'rgba(240, 168, 48, 0.04)' : 'rgba(217, 119, 6, 0.03)' }]} />

      {particles.map((p, i) => {
        const translateX = p.anim.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [0, p.radius, 0, -p.radius, 0],
        });
        const translateY = p.anim.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [-p.radius, 0, p.radius, 0, -p.radius],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                opacity: p.opacity * particleOpacityScale,
                backgroundColor: i % 3 === 0 ? colors.amber : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.15)'),
                transform: [{ translateX }, { translateY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -SCREEN_H * 0.2,
    left: SCREEN_W / 2 - 250,
    width: 500,
    height: 500,
    borderRadius: 250,
  },
  particle: {
    position: 'absolute',
  },
});
