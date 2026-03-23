import {
  PrismaClient,
  RequestStatus,
  RequestType,
  RequesterType,
  UserRole,
} from "@prisma/client";
import { z } from "zod";

import { hashPassword } from "../src/lib/security/password";
import { requestSeeds } from "../src/data/request-seeds";

const prisma = new PrismaClient();

const statusMap = {
  Recebida: RequestStatus.RECEBIDA,
  "Em analise": RequestStatus.EM_ANALISE,
  "Pronta para envio": RequestStatus.PRONTA_PARA_ENVIO,
} as const;

const typeMap = {
  desconto: RequestType.DESCONTO,
  parcelamento: RequestType.PARCELAMENTO,
  desmembramento: RequestType.DESMEMBRAMENTO,
} as const;

const requesterTypeMap = {
  responsavel: RequesterType.RESPONSAVEL,
  escola: RequesterType.ESCOLA,
} as const;

const adminSeedEnvSchema = z.object({
  SAF_ADMIN_EMAIL: z
    .string()
    .email("SAF_ADMIN_EMAIL deve ser um e-mail valido."),
  SAF_ADMIN_PASSWORD: z
    .string()
    .min(8, "SAF_ADMIN_PASSWORD deve ter pelo menos 8 caracteres."),
});

async function main() {
  const adminEnv = adminSeedEnvSchema.parse({
    SAF_ADMIN_EMAIL: process.env.SAF_ADMIN_EMAIL,
    SAF_ADMIN_PASSWORD: process.env.SAF_ADMIN_PASSWORD,
  });
  const adminPasswordHash = await hashPassword(adminEnv.SAF_ADMIN_PASSWORD);

  await prisma.user.upsert({
    where: {
      email: adminEnv.SAF_ADMIN_EMAIL,
    },
    update: {
      name: "SAF Admin",
      passwordHash: adminPasswordHash,
      role: UserRole.SAF_ADMIN,
      isActive: true,
    },
    create: {
      email: adminEnv.SAF_ADMIN_EMAIL,
      name: "SAF Admin",
      passwordHash: adminPasswordHash,
      role: UserRole.SAF_ADMIN,
      isActive: true,
    },
  });

  await prisma.voucherRequest.deleteMany();

  await prisma.voucherRequest.createMany({
    data: requestSeeds.map(({ data, status }) => ({
      status: statusMap[status],
      schoolName: data.schoolName,
      ticketNumber: data.ticketNumber,
      requesterType: requesterTypeMap[data.requesterType],
      requesterName: data.requesterName,
      origin: data.origin,
      justification: data.justification,
      studentNames: data.studentNames,
      studentClassName: data.studentClassName,
      requestType: typeMap[data.requestType],
      responsible1Name: data.responsible1Name,
      responsible1Cpf: data.responsible1Cpf,
      responsible2Name: data.responsible2Name,
      responsible2Cpf: data.responsible2Cpf,
      discountPercentage: data.discountPercentage,
      installmentCount: data.installmentCount,
      campaignVoucherCode: data.campaignVoucherCode,
      splitInstruction: data.splitInstruction,
    })),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
