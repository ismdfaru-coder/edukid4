
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, loginSchema } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import { db } from "./db";
import { questions, topics, users } from "@shared/schema";
import { eq } from "drizzle-orm";

const SessionStore = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    userId: number;
    role: "student" | "teacher" | "parent";
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "edukid_secret",
      resave: false,
      saveUninitialized: false,
      rolling: true, // Reset cookie expiration on every request
      store: new SessionStore({ 
        checkPeriod: 86400000,
        ttl: 60 * 60 * 24 // 24 hours in seconds
      }),
      cookie: { 
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours in milliseconds
      }, 
    })
  );

  // === AUTH ===
  app.post(api.auth.login.path, async (req, res) => {
    const { username, password, role } = req.body;

    // Universal admin login - handle this FIRST before ANY other logic or validation
    if (username === "admin" && password === "admin") {
      const requestedRole = role || "student";
      let user = await storage.getUserByUsername("admin");
      
      if (!user) {
        user = await storage.createUser({
          username: "admin",
          password: "admin",
          role: requestedRole,
          firstName: "Admin",
          picturePassword: null,
          avatarConfig: {},
          classId: null,
          parentId: null,
          yearGroup: requestedRole === "student" ? 5 : null,
        });
      } else {
        // Force update role to match login request
        await db.update(users).set({ role: requestedRole }).where(eq(users.id, user.id));
        user.role = requestedRole;
      }
      
      req.session.userId = user.id;
      req.session.role = requestedRole;
      return res.json({ ...user, role: requestedRole });
    }

    try {
      // Standard validation for other users
      const input = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(input.username);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.role !== input.role) {
        return res.status(401).json({ message: "Invalid role for this user" });
      }

      // Simple password check (In production, use hashing!)
      // For students with picture password, we check the array match
      if (user.role === "student" && input.picturePassword) {
        const stored = user.picturePassword; // e.g. ["cat", "dog", "apple"]
        const provided = input.picturePassword;
        const isMatch = stored && 
          stored.length === provided.length && 
          stored.every((val, index) => val === provided[index]);
          
        if (!isMatch) return res.status(401).json({ message: "Wrong picture password" });
      } else {
        // Standard password
        if (user.password !== input.password) {
          return res.status(401).json({ message: "Invalid password" });
        }
      }

      req.session.userId = user.id;
      req.session.role = user.role as any;
      res.json(user);
    } catch (e) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).send();
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).send();
    res.json(user);
  });

  // === LEARNING ===
  app.get(api.learning.getTopics.path, async (req, res) => {
    const stage = req.query.stage as string | undefined;
    const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
    const allTopics = await storage.getTopics(stage);
    
    // Filter by subject if provided
    const filteredTopics = subjectId 
      ? allTopics.filter(t => t.subjectId === subjectId)
      : allTopics;
    
    // If student, attach mastery
    if (req.session.role === "student" && req.session.userId) {
      const topicsWithMastery = await Promise.all(filteredTopics.map(async (t) => {
        const m = await storage.getMastery(req.session.userId!, t.id);
        return { ...t, mastery: m?.score || 0 };
      }));
      return res.json(topicsWithMastery);
    }
    
    res.json(filteredTopics);
  });

  app.get(api.learning.getNextQuestion.path, async (req, res) => {
    const rawTopicId = req.query.topicId;
    const topicId = Number(rawTopicId);
    
    if (isNaN(topicId)) {
      return res.status(400).json({ message: "Invalid topic ID" });
    }

    if (!req.session.userId) return res.status(401).send();
    
    const currentUser = await storage.getUser(req.session.userId);
    const userYear = currentUser?.yearGroup ?? 5; // Default to year 5 if null
    
    // Pick based on difficulty vs mastery
    const topicMastery = await storage.getMastery(req.session.userId, topicId);
    const currentScore = topicMastery?.score || 0;
    
    const targetDifficulty = Math.max(1, Math.min(5, Math.floor(currentScore * 5) + 1));
    
    const allQuestions = await storage.getQuestionsByTopic(topicId);
    if (allQuestions.length === 0) return res.status(404).json({ message: "No questions found" });
    
    // Get history from query
    const rawHistory = req.query.history as string | undefined;
    const history = rawHistory ? rawHistory.split(",").map(Number) : [];

    // Filter by year group and difficulty
    let candidateQuestions = allQuestions.filter(q => {
      const minYear = (q as any).minYearGroup ?? 1;
      const maxYear = (q as any).maxYearGroup ?? 9;
      return userYear >= minYear && userYear <= maxYear && q.difficulty === targetDifficulty && !history.includes(q.id);
    });

    if (candidateQuestions.length === 0) {
      candidateQuestions = allQuestions.filter(q => {
        const minYear = (q as any).minYearGroup ?? 1;
        const maxYear = (q as any).maxYearGroup ?? 9;
        return userYear >= minYear && userYear <= maxYear && !history.includes(q.id);
      });
    }

    if (candidateQuestions.length === 0) {
      // If still no questions (all answered), reset history for this topic
      candidateQuestions = allQuestions.filter(q => {
        const minYear = (q as any).minYearGroup ?? 1;
        const maxYear = (q as any).maxYearGroup ?? 9;
        return userYear >= minYear && userYear <= maxYear;
      });
    }

    if (candidateQuestions.length === 0) {
      candidateQuestions = allQuestions; // Absolute fallback
    }
    
    const randomQ = candidateQuestions[Math.floor(Math.random() * candidateQuestions.length)];
    res.json(randomQ);
  });

  app.post(api.learning.submitAnswer.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).send();
    
    const { questionId, answer, timeTaken } = req.body;
    const question = await storage.getQuestion(questionId);
    
    if (!question) return res.status(404).json({ message: "Question not found" });
    
    const isCorrect = question.correctAnswer === answer;
    
    // Log event and update mastery
    await storage.logLearningEvent(req.session.userId, questionId, isCorrect, timeTaken);
    await storage.updateMastery(req.session.userId, question.topicId, isCorrect ? 1.0 : 0.0);
    
    // Get new mastery
    const masteryRecord = await storage.getMastery(req.session.userId, question.topicId);
    
    res.json({
      correct: isCorrect,
      correctAnswer: question.correctAnswer,
      coinsEarned: isCorrect ? 10 : 0,
      newMastery: masteryRecord?.score || 0,
      feedback: isCorrect ? "Great job!" : question.explanation || "Keep trying!",
    });
  });

  // === SEED DATA ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingUsers = await storage.getUserByUsername("student1");
  if (existingUsers) return;

  // Create Science Topics (subjectId: 1)
  const scienceTopics = [
    { name: "Electricity", slug: "electricity", stage: "KS2", subjectId: 1, description: "Circuits and conductors" },
    { name: "Plants", slug: "plants", stage: "KS2", subjectId: 1, description: "Photosynthesis and growth" },
    { name: "Space", slug: "space", stage: "KS2", subjectId: 1, description: "Planets and the solar system" },
  ];

  // Create Maths Topics (subjectId: 2)
  const mathsTopics = [
    { name: "Addition", slug: "addition", stage: "KS2", subjectId: 2, description: "Adding numbers together" },
    { name: "Subtraction", slug: "subtraction", stage: "KS2", subjectId: 2, description: "Taking numbers away" },
    { name: "Multiplication", slug: "multiplication", stage: "KS2", subjectId: 2, description: "Times tables and products" },
    { name: "Division", slug: "division", stage: "KS2", subjectId: 2, description: "Sharing and grouping" },
    { name: "Fractions", slug: "fractions", stage: "KS2", subjectId: 2, description: "Parts of a whole" },
  ];
  
  const createdTopics = [];
  for (const t of [...scienceTopics, ...mathsTopics]) {
    const [topic] = await db.insert(topics).values(t).returning();
    createdTopics.push(topic);
  }

  // Create Users
  await storage.createUser({
    username: "admin",
    password: "admin",
    role: "teacher",
    firstName: "Admin",
    picturePassword: null,
    avatarConfig: {},
    classId: null,
    parentId: null,
    yearGroup: null,
  });

  await storage.createUser({
    username: "student1",
    role: "student",
    firstName: "Alex",
    yearGroup: 5,
    picturePassword: null,
    password: "admin",
    avatarConfig: { color: "blue" },
    classId: null,
    parentId: null,
  });

  // Create Addition Questions
  const addition = createdTopics.find(t => t.slug === "addition");
  if (addition) {
    await db.insert(questions).values([
      { topicId: addition.id, content: "What is 5 + 3?", correctAnswer: "8", distractors: ["7", "9", "6"], difficulty: 1, minYearGroup: 1, maxYearGroup: 3, type: "multiple_choice", explanation: "5 + 3 = 8" },
      { topicId: addition.id, content: "What is 12 + 7?", correctAnswer: "19", distractors: ["18", "20", "17"], difficulty: 2, minYearGroup: 2, maxYearGroup: 4, type: "multiple_choice", explanation: "12 + 7 = 19" },
      { topicId: addition.id, content: "What is 25 + 16?", correctAnswer: "41", distractors: ["40", "42", "39"], difficulty: 3, minYearGroup: 3, maxYearGroup: 5, type: "multiple_choice", explanation: "25 + 16 = 41" },
      { topicId: addition.id, content: "What is 48 + 27?", correctAnswer: "75", distractors: ["74", "76", "65"], difficulty: 4, minYearGroup: 4, maxYearGroup: 6, type: "multiple_choice", explanation: "48 + 27 = 75" },
      { topicId: addition.id, content: "What is 156 + 89?", correctAnswer: "245", distractors: ["235", "255", "244"], difficulty: 5, minYearGroup: 5, maxYearGroup: 7, type: "multiple_choice", explanation: "156 + 89 = 245" },
      { topicId: addition.id, content: "What is 342 + 589?", correctAnswer: "931", distractors: ["921", "941", "831"], difficulty: 6, minYearGroup: 6, maxYearGroup: 8, type: "multiple_choice", explanation: "342 + 589 = 931" },
      { topicId: addition.id, content: "If you have 15 apples and buy 23 more, how many do you have?", correctAnswer: "38", distractors: ["37", "39", "35"], difficulty: 2, minYearGroup: 2, maxYearGroup: 4, type: "multiple_choice", explanation: "15 + 23 = 38" },
    ]);
  }

  // Create Science - Electricity Questions
  const electricity = createdTopics.find(t => t.slug === "electricity");
  if (electricity) {
    await db.insert(questions).values([
      {
        topicId: electricity.id,
        content: "Which of these is a good conductor of electricity?",
        correctAnswer: "Copper",
        distractors: ["Wood", "Plastic", "Rubber"],
        difficulty: 2,
        minYearGroup: 3,
        maxYearGroup: 6,
        type: "multiple_choice",
        explanation: "Metals like copper allow electricity to flow freely."
      },
      {
        topicId: electricity.id,
        content: "What component breaks a circuit to stop the flow?",
        correctAnswer: "Switch",
        distractors: ["Battery", "Bulb", "Wire"],
        difficulty: 3,
        minYearGroup: 3,
        maxYearGroup: 6,
        type: "multiple_choice",
        explanation: "A switch opens the circuit gap."
      },
      {
        topicId: electricity.id,
        content: "What is the unit used to measure electric current?",
        correctAnswer: "Ampere",
        distractors: ["Volt", "Watt", "Ohm"],
        difficulty: 5,
        minYearGroup: 6,
        maxYearGroup: 9,
        type: "multiple_choice",
        explanation: "The Ampere (Amp) is the unit of electric current."
      }
    ]);
  }
}
