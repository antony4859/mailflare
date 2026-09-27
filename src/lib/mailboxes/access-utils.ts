import type { AppDatabase } from "@/db";

export async function isTeamMailboxSharingEnabled(db: AppDatabase): Promise<boolean> {
	void db;
	return true;
}
