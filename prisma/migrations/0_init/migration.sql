-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "agentPersonality" TEXT NOT NULL,
    "serviceArea" TEXT NOT NULL,
    "jobTypes" TEXT NOT NULL,
    "pricingRanges" TEXT NOT NULL,
    "emergencyAvail" BOOLEAN NOT NULL DEFAULT false,
    "businessHours" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "ghlWebhookUrl" TEXT,
    "ghlApiKey" TEXT,
    "widgetColor" TEXT NOT NULL DEFAULT '#C17B2A',
    "greeting" TEXT NOT NULL DEFAULT 'Hi! How can I help you today?',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "messages" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "leadCaptured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "jobType" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "quoteRangeLow" INTEGER,
    "quoteRangeHigh" INTEGER,
    "bestTimeToCall" TEXT,
    "conversationSummary" TEXT NOT NULL,
    "sentToGHL" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentClient" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerFirstName" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "website" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT,
    "businessAddress" TEXT,
    "tonePreference" TEXT NOT NULL DEFAULT 'friendly',
    "tagline" TEXT,
    "servicesOffered" TEXT NOT NULL,
    "typicalJobTypes" TEXT,
    "avgTicketSize" TEXT,
    "idealCustomer" TEXT,
    "novaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rexEnabled" BOOLEAN NOT NULL DEFAULT false,
    "irisEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dellaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "flynnEnabled" BOOLEAN NOT NULL DEFAULT false,
    "coleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "riverEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sageEnabled" BOOLEAN NOT NULL DEFAULT false,
    "atlasEnabled" BOOLEAN NOT NULL DEFAULT false,
    "googleReviewLink" TEXT,
    "googlePlaceId" TEXT,
    "yelpBusinessId" TEXT,
    "rexLastScrapeAt" TIMESTAMP(3),
    "irisFollowUpDay1" INTEGER NOT NULL DEFAULT 1,
    "irisFollowUpDay2" INTEGER NOT NULL DEFAULT 3,
    "irisFollowUpDay3" INTEGER NOT NULL DEFAULT 7,
    "maxReviewDelayDays" INTEGER NOT NULL DEFAULT 2,
    "maxPaymentReminderDays" TEXT NOT NULL DEFAULT '7,14,30',
    "riverBusinessHours" TEXT,
    "riverAppointmentTypes" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'complete',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT,
    "reviewerName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reviewText" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "draftResponse" TEXT,
    "finalResponse" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyRepReport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "totalReviews" INTEGER NOT NULL,
    "avgRating" DOUBLE PRECISION NOT NULL,
    "fiveStarCount" INTEGER NOT NULL,
    "oneStarCount" INTEGER NOT NULL,
    "summaryText" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyRepReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IrisLead" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "novaLeadId" TEXT,
    "leadName" TEXT NOT NULL,
    "leadEmail" TEXT,
    "leadPhone" TEXT,
    "source" TEXT NOT NULL DEFAULT 'nova',
    "serviceNeeded" TEXT,
    "initialMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "lastFollowUpAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IrisLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IrisFollowUp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "followUpNum" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IrisFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaxJob" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "serviceProvided" TEXT NOT NULL,
    "jobValue" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "reviewRequested" BOOLEAN NOT NULL DEFAULT false,
    "reviewRequestedAt" TIMESTAMP(3),
    "reviewReceived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaxJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaxInvoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "invoiceNumber" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "remindersCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaxInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaxReminder" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reminderNum" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaxReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DellaDraft" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "requestNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DellaDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlynnVehicle" (
    "id" TEXT NOT NULL,
    "agentClientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mileage" INTEGER,
    "nextService" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlynnVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColeInventoryItem" (
    "id" TEXT NOT NULL,
    "agentClientId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION,
    "reorderAt" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColeInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiverAppointment" (
    "id" TEXT NOT NULL,
    "agentClientId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "appointmentType" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiverAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SagePost" (
    "id" TEXT NOT NULL,
    "agentClientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SagePost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_sessionId_key" ON "Conversation"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_conversationId_key" ON "Lead"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_clientId_platform_externalId_key" ON "Review"("clientId", "platform", "externalId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "AgentClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyRepReport" ADD CONSTRAINT "WeeklyRepReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "AgentClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrisLead" ADD CONSTRAINT "IrisLead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "AgentClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrisFollowUp" ADD CONSTRAINT "IrisFollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "IrisLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaxJob" ADD CONSTRAINT "MaxJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "AgentClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaxInvoice" ADD CONSTRAINT "MaxInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "AgentClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaxReminder" ADD CONSTRAINT "MaxReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "MaxInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DellaDraft" ADD CONSTRAINT "DellaDraft_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "AgentClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlynnVehicle" ADD CONSTRAINT "FlynnVehicle_agentClientId_fkey" FOREIGN KEY ("agentClientId") REFERENCES "AgentClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColeInventoryItem" ADD CONSTRAINT "ColeInventoryItem_agentClientId_fkey" FOREIGN KEY ("agentClientId") REFERENCES "AgentClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiverAppointment" ADD CONSTRAINT "RiverAppointment_agentClientId_fkey" FOREIGN KEY ("agentClientId") REFERENCES "AgentClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SagePost" ADD CONSTRAINT "SagePost_agentClientId_fkey" FOREIGN KEY ("agentClientId") REFERENCES "AgentClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

