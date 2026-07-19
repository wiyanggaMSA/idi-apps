import AppFooter from "@/Components/App/AppFooter";

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col bg-gray-100">
            <div className="flex flex-1 flex-col items-center px-4 pt-6 sm:justify-center sm:pt-0">
                <div className="w-full overflow-hidden bg-white px-6 py-4 shadow-md sm:max-w-md sm:rounded-lg">
                    {children}
                </div>
            </div>

            <AppFooter className="sticky bottom-0 z-20" />
        </div>
    );
}
