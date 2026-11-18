import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Workflow, Zap, Eye, GitBranch, ArrowRight, MessageSquare } from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      icon: Workflow,
      title: 'Visual automation',
      description: 'Build complex workflows with an intuitive drag-and-drop interface. No coding required.'
    },
    {
      icon: GitBranch,
      title: 'Node-based logic',
      description: 'Connect nodes to create powerful automation chains with conditional branching and data transformation.'
    },
    {
      icon: Eye,
      title: 'Real-time execution',
      description: 'Watch your workflows execute in real-time with detailed console logging and visual feedback.'
    },
    {
      icon: Zap,
      title: 'Instant results',
      description: 'See the output of each node as it processes, making debugging and optimization effortless.'
    }
  ];

  return (
    <>
      <Helmet>
      console.log("GROQ KEY:", process.env.GROQ_API_KEY ? "FOUND" : "MISSING");
        <title>NodeFlow - Visual automation platform</title>
        <meta name="description" content="Build powerful automation workflows with drag-and-drop nodes. Real-time execution, visual feedback, and instant results." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="py-24 text-center"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Workflow className="w-4 h-4" />
              Visual automation platform
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight" style={{ letterSpacing: '-0.02em' }}>
              Build workflows with
              <br />
              <span className="text-primary">drag-and-drop nodes</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              Create powerful automation chains by connecting visual nodes. Transform data, apply filters, add delays, and watch everything execute in real-time.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 active:scale-[0.98]">
                <Link to="/chat">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Build with chat
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="transition-all duration-200 active:scale-[0.98]">
                <Link to="/nodeflow">
                  Open node editor
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="py-20"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-card-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="py-20 text-center"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-12 border border-primary/20">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" style={{ letterSpacing: '-0.02em' }}>
                Ready to automate?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Start building visual workflows in seconds. Connect nodes, configure actions, and watch your automation come to life.
              </p>
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 active:scale-[0.98]">
                <Link to="/nodeflow">
                  Launch editor
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </motion.section>
        </div>

        <footer className="border-t border-border py-8 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">NodeFlow</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span>© 2026 NodeFlow</span>
                <span>Privacy Policy</span>
                <span>Terms of Service</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HomePage;