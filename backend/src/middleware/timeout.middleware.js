export const requestTimeout = (ms = 30000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent && !res.writableEnded) {
        res.status(503).json({
          success: false,
          message: "Request timeout. Server overloaded."
        });
      }
    }, ms);

    const clear = () => clearTimeout(timer);
    res.on("finish", clear);
    res.on("close", clear);
    res.on("error", clear);

    next();
  };
};
