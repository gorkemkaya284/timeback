'use client';

interface EnvErrorDisplayProps {
  missing: string[];
}

export default function EnvErrorDisplay({ missing }: EnvErrorDisplayProps) {
  return (
    <div className="bg-white py-8 px-6 shadow rounded-lg">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Yapılandırma gerekli
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p className="mb-2">
                Aşağıdaki ortam değişkenleri tanımlı değil:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {missing.map((varName) => (
                  <li key={varName} className="font-mono text-xs">
                    {varName}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Nasıl düzeltilir
        </h4>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">.env.local</code> dosyası oluşturun ve Supabase Settings &gt; API adresindeki anon key ile URL değerlerini ekleyin.
        </p>
        <pre className="p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}
        </pre>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          Değişkenleri ekledikten sonra sunucuyu yeniden başlatın.
        </p>
      </div>
    </div>
  );
}
