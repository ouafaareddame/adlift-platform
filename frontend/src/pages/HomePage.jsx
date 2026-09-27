import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { AdliftLogo } from "@/components/brand/AdliftLogo";
import { ProductShowcase } from "@/components/brand/ProductShowcase";
import { useAuth } from "@/context/AuthContext";
import { homeForRole } from "@/routes/ProtectedRoute";

const fadeUp = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const appPath = homeForRole(user?.role);

  return (
    <div className="h-dvh overflow-hidden bg-background lg:grid lg:grid-cols-2">
      <div className="flex h-full min-h-0 flex-col px-6 py-6 sm:px-12 lg:px-16">
        <header className="flex items-center justify-between">
          <Link to="/" aria-label="Adlift home">
            <AdliftLogo className="h-20 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to={appPath}>
                <Button variant="accent">Open workspace</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="accent">Sign in</Button>
              </Link>
            )}
          </div>
        </header>

        <motion.main
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent"
          >
            Adlift · campaign cockpit
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="mt-5 text-3xl font-semibold leading-snug tracking-tight text-ink sm:text-[2.4rem]"
          >
            One place to run email, social and ads
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 text-sm leading-relaxed text-ink-muted sm:text-base">
            Plan campaigns, follow spend and keep your agency workspace in one cockpit.
          </motion.p>

          {!isAuthenticated && (
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/login">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="accent" className="px-6 py-3">
                    Sign in to your workspace
                  </Button>
                </motion.div>
              </Link>
              <p className="text-xs text-ink-muted">Access is provided by your Adlift account manager.</p>
            </motion.div>
          )}

          <motion.p variants={fadeUp} className="mt-10 text-xs font-medium tracking-wide text-ink-subtle">
            EMAIL · SOCIAL · ADS
          </motion.p>
        </motion.main>
      </div>

      <ProductShowcase className="hidden lg:flex lg:h-dvh lg:flex-col" />
    </div>
  );
}
