import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import inquiriesRouter from "./inquiries";
import patientsRouter from "./patients";
import activitiesRouter from "./activities";
import reportsRouter from "./reports";
import settingsRouter from "./settings";
import referralsRouter from "./referrals";
import pipelineRouter from "./pipeline";
import analyticsRouter from "./analytics";
import aiRouter from "./ai";
import webhooksRouter from "./webhooks";
import bdRouter from "./bd";
import bdReportsRouter from "./bdReports";
import auditLogsRouter from "./auditLogs";
import bedsRouter from "./beds";
import savedReportsRouter from "./savedReports";
import eventsRouter from "./events";
import adminRouter from "./admin";
import smsRouter from "./sms";
import chatbotRouter from "./chatbot";
import dischargesRouter from "./discharges";
import aiStageSuggestionsRouter from "./aiStageSuggestions";

const router: IRouter = Router();

router.use(chatbotRouter);  // chatbot/message, chatbot/submit (public)
router.use(smsRouter);      // sms/send, sms/threads, webhooks/twilio/sms
router.use(webhooksRouter);
router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(inquiriesRouter);
router.use(patientsRouter);
router.use(activitiesRouter);
router.use(reportsRouter);
router.use(settingsRouter);
router.use(referralsRouter);
router.use(pipelineRouter);
router.use(analyticsRouter);
router.use(aiRouter);
router.use(bdRouter);
router.use(bdReportsRouter);
router.use(auditLogsRouter);
router.use(bedsRouter);
router.use(savedReportsRouter);
router.use(eventsRouter);
router.use(adminRouter);
router.use(dischargesRouter);
router.use(aiStageSuggestionsRouter);

export default router;
