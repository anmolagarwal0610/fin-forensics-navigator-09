
import { motion } from "framer-motion";
import { Brain, Zap, Shield, TrendingUp, Users, FileSearch } from "lucide-react";

const DifferentiatorSection = () => {
  const differentiators = [
    {
      icon: Brain,
      title: "Advanced ML Intelligence",
      description: "Our proprietary algorithms detect patterns invisible to traditional analysis",
      color: "from-accent to-primary"
    },
    {
      icon: Zap,
      title: "Lightning Fast Processing",
      description: "Hours instead of weeks - accelerate your investigation timeline",
      color: "from-warning to-accent"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade encryption with SOC 2 compliance and audit trails",
      color: "from-success to-primary"
    },
    {
      icon: TrendingUp,
      title: "Actionable Insights",
      description: "Not just data - clear recommendations for your next investigative steps",
      color: "from-primary to-success"
    },
    {
      icon: Users,
      title: "Person Detection",
      description: "Automatically identify key individuals and suspicious relationships",
      color: "from-accent to-success"
    },
    {
      icon: FileSearch,
      title: "Multi-Format Support",
      description: "Process any financial document format with 99.9% accuracy",
      color: "from-warning to-primary"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-background via-muted/20 to-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-64 h-64 bg-accent rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
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
            What Makes FinNavigator{" "}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              Different
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            While others provide basic document scanning, we deliver intelligent financial forensics 
            powered by cutting-edge machine learning and years of investigative expertise.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {differentiators.map((item, index) => (
            <motion.div
              key={item.title}
              className="group relative"
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
            >
              <div className="h-full p-8 rounded-2xl bg-card border border-border hover:border-accent/50 transition-all duration-300 hover:shadow-strong relative overflow-hidden">
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                {/* Icon */}
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-accent/10 to-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                  whileHover={{ rotate: 5 }}
                >
                  <item.icon className="w-8 h-8 text-accent group-hover:text-primary transition-colors duration-300" />
                </motion.div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-4 text-foreground group-hover:text-accent transition-colors duration-300">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>

                {/* Hover Effect Border */}
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-accent/20 transition-colors duration-300" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DifferentiatorSection;
