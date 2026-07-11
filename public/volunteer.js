document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('volunteerForm');
    const successMessage = document.getElementById('successMessage');

    if (!form || !successMessage) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/volunteerdata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            successMessage.textContent = result.message || 'Thank you for your submission!';
            successMessage.style.display = 'block';

            if (result.success) {
                form.reset();
                window.setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1200);
            }
        } catch (error) {
            successMessage.textContent = 'Submission failed. Please try again.';
            successMessage.style.display = 'block';
        }
    });
});
