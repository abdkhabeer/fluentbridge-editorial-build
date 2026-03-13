import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const videos = ["/videos/hero1.mp4", "/videos/hero2.mp4", "/videos/hero3.mp4"];

const Hero = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentVideo, setCurrentVideo] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      setCurrentVideo((prev) => (prev + 1) % videos.length);
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = videos[currentVideo];
    video.play().catch(() => {});
  }, [currentVideo]);

  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        playsInline
        src={videos[0]}
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
            Build Confidence.<br />
            Speak English Clearly.
          </h1>
          <p className="text-body-lg text-warm-white/80 max-w-xl mb-10">
            Personalized online English lessons designed for professionals and motivated learners in Cairo and beyond.
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
