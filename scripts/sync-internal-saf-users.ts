import { randomBytes } from "node:crypto";

import { PrismaClient, UserRole } from "@prisma/client";

import { INTERNAL_SAF_CONSULTANTS } from "../src/data/internal-saf-consultants";
import { hashPassword } from "../src/lib/security/password";

const prisma = new PrismaClient();

async function main() {
  const results: Array<{
    email: string;
    name: string;
    status: "created" | "updated";
    role: UserRole;
    isActive: boolean;
  }> = [];

  for (const consultant of INTERNAL_SAF_CONSULTANTS) {
    const existingUser = await prisma.user.findUnique({
      where: {
        email: consultant.email,
      },
      select: {
        id: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (existingUser) {
      const updatedUser = await prisma.user.update({
        where: {
          email: consultant.email,
        },
        data: {
          name: consultant.displayName,
          role: UserRole.SAF_OPERADOR,
        },
        select: {
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });

      results.push({
        email: updatedUser.email,
        name: updatedUser.name,
        status: "updated",
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      });
      continue;
    }

    const randomPassword = randomBytes(24).toString("hex");
    const passwordHash = await hashPassword(randomPassword);
    const createdUser = await prisma.user.create({
      data: {
        email: consultant.email,
        name: consultant.displayName,
        passwordHash,
        role: UserRole.SAF_OPERADOR,
        isActive: false,
      },
      select: {
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    results.push({
      email: createdUser.email,
      name: createdUser.name,
      status: "created",
      role: createdUser.role,
      isActive: createdUser.isActive,
    });
  }

  console.log(
    JSON.stringify(
      {
        created: results.filter((result) => result.status === "created").length,
        updated: results.filter((result) => result.status === "updated").length,
        users: results.sort((left, right) =>
          left.email.localeCompare(right.email, "pt-BR"),
        ),
      },
      null,
      2,
    ),
  );
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
