import lazyScreen, { lazyWhenOpen } from './lazy-screen';

export const Dashboard = lazyScreen(() => import('./dashboard-page').then(m => ({ default: m.Dashboard })));
export const Orders = lazyScreen(() => import('./orders-page').then(m => ({ default: m.Orders })));
export const NewOrder = lazyScreen(() => import('./new-order-page').then(m => ({ default: m.NewOrder })));
export const FinancePage = lazyScreen(() => import('./finance-page').then(m => ({ default: m.FinancePage })));
export const SettingsPage = lazyScreen(() => import('./settings-page').then(m => ({ default: m.SettingsPage })));
export const PostSalePage = lazyScreen(() => import('./post-sale-page').then(m => ({ default: m.PostSalePage })));
export const QuickEntry = lazyWhenOpen(() => import('./quick-entry').then(m => ({ default: m.QuickEntry })));
export const ClientsPage = lazyScreen(() => import('./clients-page'));
export const SuppliersPage = lazyScreen(() => import('./suppliers-page'));
export const ExpenseControlPage = lazyScreen(() => import('./expense-control-page'));
export const ServicesCatalogPage = lazyScreen(() => import('./services-page'));
export const ProductsCatalogPage = lazyScreen(() => import('./services-page').then(m => ({ default: m.ProductsCatalogPage })));
export const OrderDetailPage = lazyScreen(() => import('./order-detail-page'));
export const CameraModal = lazyScreen(() => import('./order-detail-react').then(m => ({ default: m.CameraModal })));
export const ClientImport = lazyScreen(() => import('./client-import'));
export const TermTextEditor = lazyScreen(() => import('./term-text-editor'));
export const DatabaseResetPanel = lazyScreen(() => import('./database-reset'));
