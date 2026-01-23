export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Toplam Ürün</h3>
          <p className="text-3xl font-bold text-gray-800">-</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Aktif Firmalar</h3>
          <p className="text-3xl font-bold text-gray-800">-</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Bekleyen Teklifler</h3>
          <p className="text-3xl font-bold text-gray-800">-</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Bu Ay</h3>
          <p className="text-3xl font-bold text-gray-800">-</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Hoş Geldiniz</h2>
        <p className="text-gray-600">
          Teklif yönetim sisteminize hoş geldiniz. Başlamak için menüden istediğiniz bölümü seçebilirsiniz.
        </p>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-500">✓ Excel ile toplu ürün ekleyin</p>
          <p className="text-sm text-gray-500">✓ Firma bazlı iskonto kuralları oluşturun</p>
          <p className="text-sm text-gray-500">✓ AI destekli otomatik teklif hazırlayın</p>
        </div>
      </div>
    </div>
  )
}
