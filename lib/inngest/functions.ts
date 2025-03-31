import { sendEmail } from "@/actions/send-email";
import { db } from "../prisma";
import { inngest } from "./client";
import EmailTemplate from "@/emails/template";

export const checkBudgetAlerts = inngest.createFunction(
  { id: "check-budget-alerts", name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" }, // Runs every 6 hours
  async ({ step }) => {
    const budgets = await step.run("fetch-budgets", async () => {
      return await db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: {
                where: { isDefault: true },
              },
            },
          },
        },
      });
    });

    // Run all budget checks in parallel using Promise.all
    await Promise.all(
      budgets.map(async (budget) => {
        const defaultAccount = budget.user.accounts[0];
        if (!defaultAccount) return;

        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const expenses = await step.run(`fetch-expenses-${budget.id}`, async () => {
          return await db.transaction.aggregate({
            where: {
              userId: budget.userId,
              accountId: defaultAccount.id,
              type: "EXPENSE",
              date: { gte: startOfMonth, lte: endOfMonth },
            },
            _sum: { amount: true },
          });
        });

        const totalExpenses = Number(expenses._sum.amount) || 0;
        const budgetAmount = Number(budget.amount);
        const percentageUsed = (totalExpenses / budgetAmount) * 100;

        console.log(`Budget ID: ${budget.id}, Percentage Used: ${percentageUsed}`);

        if (percentageUsed >= 80 && (!budget.lastAlertSent || isNewMonth(new Date(budget.lastAlertSent), new Date()))) {
          await step.run(`send-email-${budget.id}`, async () => {
            await sendEmail({
              to: budget.user.email,
              subject: `Budget Alert for ${defaultAccount.name}`,
              react: EmailTemplate({
                userName: budget.user.name ?? "User",
                type: "budget-alert",
                data: {
                  percentageUsed,
                  budgetAmount: budgetAmount.toFixed(1),
                  totalExpenses: totalExpenses.toFixed(1),
                  accountName: defaultAccount.name,
                },
              }),
            });

            await db.budget.update({
              where: { id: budget.id },
              data: { lastAlertSent: new Date() },
            });
          });
        }
      })
    );

    console.log("Budget check completed successfully.");
    return { success: true };
  }
);

function isNewMonth(lastAlertDate: Date, currentDate: Date): boolean {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}
