export const motionDuration = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.28
};

export const motionEase = [0.22, 1, 0.36, 1];

export const fadeIn = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: motionDuration.normal,
      ease: motionEase
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: motionDuration.fast,
      ease: motionEase
    }
  }
};

export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionDuration.normal,
      ease: motionEase
    }
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: {
      duration: motionDuration.fast,
      ease: motionEase
    }
  }
};

export const modalAnimation = {
  initial: { opacity: 0, scale: 0.98, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: motionDuration.normal,
      ease: motionEase
    }
  },
  exit: {
    opacity: 0,
    scale: 0.985,
    y: 6,
    transition: {
      duration: motionDuration.fast,
      ease: motionEase
    }
  }
};

export const drawerAnimation = {
  initial: { opacity: 0, x: 16 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: motionDuration.normal,
      ease: motionEase
    }
  },
  exit: {
    opacity: 0,
    x: 12,
    transition: {
      duration: motionDuration.fast,
      ease: motionEase
    }
  }
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.02
    }
  }
};

export const listItem = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionDuration.normal,
      ease: motionEase
    }
  }
};

export const buttonTap = {
  whileTap: { scale: 0.97 },
  transition: {
    duration: motionDuration.fast,
    ease: motionEase
  }
};
