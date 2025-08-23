
import { motion } from "framer-motion";
import { TrendingUp, Clock, Shield, Users } from "lucide-react";
import { useState } from "react";

const InteractiveStatsSection = () => {
  const [hoveredStat, setHoveredStat] = useState<number | null>(null);
  
  const stats = [
    {
      icon: TrendingUp,
      value: "99.7%",
      label: "Accuracy Rate",
      description: "Industry-leading precision in financial document analysis",
      color: "from-success to-accent"
    },
    {
      icon: Clock,
      value: "2.5hrs",
      label: "Average Processing",
      description: "From upload to actionable insights in hours, not weeks",
      color: "from-accent to-primary"
    },
    {
      icon: Shield,
      value: "SOC 2",
      label: "Compliance",
      description: "Enterprise-grade security with bank-level encryption",
      color: "from-primary to-success"
    },
    {
      icon: Users,
      value: "500+",
      label: "Investigators",
      description: "Trusted by forensic professionals worldwide",
      color: "from-warning to-accent"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-muted/20 via-background to-accent/5 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="text-center mb-16"
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              Professionals
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Numbers that speak to our commitment to excellence and innovation in financial forensics.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="relative group cursor-pointer"
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              onMouseEnter={() => setHoveredStat(index)}
              onMouseLeave={() => setHoveredStat(null)}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div className="h-full p-8 rounded-2xl bg-card border border-border group-hover:border-accent/50 transition-all duration-300 hover:shadow-strong relative overflow-hidden">
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                {/* Icon */}
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-accent/10 to-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                  animate={hoveredStat === index ? { rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <stat.icon className="w-8 h-8 text-accent group-hover:text-primary transition-colors duration-300" />
                </motion.div>

                {/* Value with counter animation */}
                <motion.div
                  className="text-4xl font-bold mb-2 text-foreground group-hover:text-accent transition-colors duration-300"
                  initial={{ scale: 1 }}
                  animate={hoveredStat === index ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {stat.value}
                </motion.div>

                {/* Label */}
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                  {stat.label}
                </h3>

                {/* Description */}
                <motion.p
                  className="text-muted-foreground leading-relaxed"
                  initial={{ opacity: 0.7, height: "auto" }}
                  animate={hoveredStat === index ? { opacity: 1 } : { opacity: 0.7 }}
                  transition={{ duration: 0.3 }}
                >
                  {stat.description}
                </motion.p>

                {/* Hover indicator */}
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-accent to-primary"
                  initial={{ width: 0 }}
                  animate={hoveredStat === index ? { width: "100%" } : { width: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InteractiveStatsSection;
