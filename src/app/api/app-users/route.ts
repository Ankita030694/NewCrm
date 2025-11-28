export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        // Fields that are allowed to be updated
        const allowedFields = ['email', 'name', 'otp', 'phone', 'role', 'start_date', 'status', 'topic'];
        const dataToUpdate: any = {};

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                dataToUpdate[field] = updateData[field];
            }
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        dataToUpdate.updated_at = Math.floor(Date.now() / 1000);

        const userRef = doc(db, 'login_users', id);
        await updateDoc(userRef, dataToUpdate);

        return NextResponse.json({ success: true, updatedFields: dataToUpdate });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
