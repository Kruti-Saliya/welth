import arcjet, { tokenBucket } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY || (() => { throw new Error("ARCJET_KEY is not defined in the environment variables."); })(),
  characteristics: ["userId"], 
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 10, 
      interval: 3600, 
      capacity: 10, 
    }),
  ],
});

export default aj;