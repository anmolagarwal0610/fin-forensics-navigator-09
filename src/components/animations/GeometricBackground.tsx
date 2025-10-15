
import { motion } from "framer-motion";

const GeometricBackground = () => {
  const shapes = [
    { size: 120, x: "10%", y: "20%", delay: 0, rotation: 45 },
    { size: 80, x: "85%", y: "15%", delay: 0.5, rotation: 90 },
    { size: 100, x: "20%", y: "80%", delay: 1, rotation: 135 },
    { size: 60, x: "90%", y: "75%", delay: 1.5, rotation: 180 },
    { size: 140, x: "60%", y: "10%", delay: 2, rotation: 225 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {shapes.map((shape, index) => (
        <motion.div
          key={index}
          className="absolute opacity-5"
          style={{
            left: shape.x,
            top: shape.y,
            width: shape.size,
            height: shape.size,
          }}
          initial={{ 
            scale: 0, 
            rotate: 0,
            opacity: 0 
          }}
          animate={{ 
            scale: [0, 1, 0.8, 1],
            rotate: [0, shape.rotation, shape.rotation + 45],
            opacity: [0, 0.1, 0.05, 0.1]
          }}
          transition={{
            duration: 20,
            delay: shape.delay,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div className="w-full h-full border-2 border-accent/30 rounded-lg transform rotate-45 bg-gradient-to-br from-accent/10 to-primary/10" />
        </motion.div>
      ))}
      
      {/* Floating particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 bg-accent/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            y: [-20, -100, -20],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 4,
            delay: Math.random() * 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

export default GeometricBackground;
