import { Request, Response } from 'express';
import { PurchaseStatus, TaskPriority, TaskStatus } from '@prisma/client';
import { ErpModulesService } from '../services/erpModules.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class ErpModulesController {
  static getDashboardAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const data = await ErpModulesService.getDashboardAnalytics(
      req.branchContext!,
      req.query.branchId as string | undefined
    );
    return sendSuccess(res, data, 'Số liệu điều hành tổng quan Đa Chi Nhánh');
  });

  // Tasks
  static listTasks = asyncHandler(async (req: Request, res: Response) => {
    const items = await ErpModulesService.listTasks(req.branchContext!, {
      branchId: req.query.branchId as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      status: req.query.status as TaskStatus | undefined,
      priority: req.query.priority as TaskPriority | undefined,
      search: req.query.search as string | undefined,
    });
    return sendSuccess(res, items, 'Danh sách công việc văn phòng');
  });

  static createTask = asyncHandler(async (req: Request, res: Response) => {
    const created = await ErpModulesService.createTask(
      req.user!,
      req.branchContext!,
      req.body,
      req.ip
    );
    return sendSuccess(res, created, 'Tạo công việc mới thành công', 201);
  });

  static updateTask = asyncHandler(async (req: Request, res: Response) => {
    const updated = await ErpModulesService.updateTaskStatus(
      req.user!,
      req.branchContext!,
      req.params.id as string,
      req.body,
      req.ip
    );
    return sendSuccess(res, updated, 'Cập nhật trạng thái công việc thành công');
  });

  // Production Plans
  static listProductionPlans = asyncHandler(async (req: Request, res: Response) => {
    const items = await ErpModulesService.listProductionPlans(req.branchContext!, {
      branchId: req.query.branchId as string | undefined,
      productionTeamId: req.query.productionTeamId as string | undefined,
      status: req.query.status as TaskStatus | undefined,
    });
    return sendSuccess(res, items, 'Danh sách kế hoạch sản xuất theo Tổ/Chuyền');
  });

  static createProductionPlan = asyncHandler(async (req: Request, res: Response) => {
    const created = await ErpModulesService.createProductionPlan(
      req.user!,
      req.branchContext!,
      req.body,
      req.ip
    );
    return sendSuccess(res, created, 'Tạo lệnh sản xuất thành công', 201);
  });

  static updateProductionPlanProgress = asyncHandler(
    async (req: Request, res: Response) => {
      const updated = await ErpModulesService.updateProductionPlanProgress(
        req.user!,
        req.branchContext!,
        req.params.id as string,
        req.body,
        req.ip
      );
      return sendSuccess(res, updated, 'Cập nhật sản lượng hoàn thành thành công');
    }
  );

  // Purchasing
  static listPurchaseRequests = asyncHandler(async (req: Request, res: Response) => {
    const items = await ErpModulesService.listPurchaseRequests(req.branchContext!, {
      branchId: req.query.branchId as string | undefined,
      status: req.query.status as PurchaseStatus | undefined,
    });
    return sendSuccess(res, items, 'Danh sách yêu cầu thu mua vật tư');
  });

  static createPurchaseRequest = asyncHandler(async (req: Request, res: Response) => {
    const created = await ErpModulesService.createPurchaseRequest(
      req.user!,
      req.branchContext!,
      req.body,
      req.ip
    );
    return sendSuccess(res, created, 'Tạo phiếu đề nghị thu mua thành công', 201);
  });

  static updatePurchaseStatus = asyncHandler(async (req: Request, res: Response) => {
    const updated = await ErpModulesService.updatePurchaseStatus(
      req.user!,
      req.branchContext!,
      req.params.id as string,
      req.body.status as PurchaseStatus,
      req.ip
    );
    return sendSuccess(res, updated, `Đã cập nhật trạng thái đơn thu mua sang ${updated.status}`);
  });

  // Customers
  static listCustomers = asyncHandler(async (req: Request, res: Response) => {
    const items = await ErpModulesService.listCustomers(req.branchContext!, {
      branchId: req.query.branchId as string | undefined,
      search: req.query.search as string | undefined,
    });
    return sendSuccess(res, items, 'Danh sách khách hàng');
  });

  static createCustomer = asyncHandler(async (req: Request, res: Response) => {
    const created = await ErpModulesService.createCustomer(
      req.user!,
      req.branchContext!,
      req.body,
      req.ip
    );
    return sendSuccess(res, created, 'Thêm khách hàng mới thành công', 201);
  });
}
