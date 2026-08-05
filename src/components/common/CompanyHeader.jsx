'use client';

export default function CompanyHeader() {
    return (
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-md">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-center md:justify-start gap-4">
                    {/* Logo */}
                    <img
                        src="/logo.png"
                        alt="WZPDCL Logo"
                        className="h-14 w-auto md:h-16 object-contain brightness-0 invert"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                        }}
                    />
                    {/* Company Info */}
                    <div className="text-center md:text-left">
                        <h1 className="text-base md:text-lg lg:text-xl font-bold tracking-wide">
                            West Zone Power Distribution Company Limited
                        </h1>
                        <p className="text-xs md:text-sm opacity-90">
                            Sales and Distribution Division-1, Kushtia
                        </p>
                        <p className="text-[10px] md:text-xs opacity-75">
                            An Enterprise of Bangladesh Power Development Board
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}