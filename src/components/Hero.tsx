import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const videos = ["/videos/hero1.mp4", "/videos/hero2.mp4", "/videos/hero3.mp4"];

const Hero = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [transitioning, setTransitioning] = useState(false);

  const currentRef = useRef<HTMLVideoElement>(null);
  const nextRef = useRef<HTMLVideoElement>(null);

  const startTransition = useCallback(() => {
    // Preload next video and start crossfade
    const nextVid = nextRef.current;
    if (nextVid) {
      nextVid.src = videos[nextIndex];
      nextVid.load();
      nextVid.play().catch(() => {});
    }
    setTransitioning(true);

    // After crossfade completes, swap roles
    setTimeout(() => {
      setCurrentIndex(nextIndex);
      setNextIndex((nextIndex + 1) % videos.length);
      setTransitioning(false);
    }, 1500);
  }, [nextIndex]);

  // Listen for current video nearing its end
  useEffect(() => {
    const video = currentRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (video.duration && video.currentTime >= video.duration - 1.5 && !transitioning) {
        startTransition();
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [startTransition, transitioning]);

  // Set source for current video when index changes
  useEffect(() => {
    const video = currentRef.current;
    if (!video) return;
    video.src = videos[currentIndex];
    video.load();
    video.play().catch(() => {});
  }, [currentIndex]);

  return (
    <section id="hero" className="relative h-[100svh] w-full overflow-hidden">
      {/* Current video */}
      <video
        ref={currentRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        playsInline
        src={videos[0]}
      />
      {/* Next video (crossfade layer) */}
      <video
        ref={nextRef}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out"
        muted
        playsInline
        style={{ opacity: transitioning ? 1 : 0 }}
      />
      <div className="absolute inset-0 bg-charcoal/50" />

      <div className="relative z-10 h-full flex flex-col justify-end pb-20 md:pb-28 container-editorial">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <p className="text-label text-warm-white/80 mb-6">
            CELTA-Certified English Coaching
          </p>
          <h1 className="text-editorial-xl text-warm-white mb-6">
            Communicate Clearly.<br />
            Speak With Confidence.
          </h1>
          <p className="text-body-lg text-warm-white/80 max-w-xl mb-10">
            Personalized online English lessons designed for students, professionals, and motivated learners in Cairo and beyond.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#contact"
              className="text-label px-8 py-4 bg-warm-white text-charcoal hover:bg-sand transition-colors text-center"
            >
              Book a Trial Lesson
            </a>
            <a
              href="#services"
              className="text-label px-8 py-4 border border-warm-white text-warm-white hover:bg-warm-white/10 transition-colors text-center"
            >
              Explore Lessons
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <a href="#intro" className="text-warm-white/60 hover:text-warm-white transition-colors">
            <ChevronDown size={28} className="animate-bounce" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
